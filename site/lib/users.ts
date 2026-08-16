// Stores Postgres des comptes : users, sessions, tokens de reset. Calqué sur
// lib/newsletter.ts (ensureSchema + pool.query). NE PAS importer côté client.
//
// Dépend de lib/db.ts (pool + schéma) et lib/password.ts (crypto) — aucun cycle :
// c'est lib/auth.ts qui compose ces stores avec les cookies et les gardes.

import { pool, ensureSchema } from "./db";
import { hashPassword, newToken, sha256 } from "./password";

export type Role = "admin" | "customer";

export interface User {
  id: number;
  email: string;
  role: Role;
  name: string | null;
  createdAt: string;
}

/** Levée quand l'email est déjà pris (contrainte UNIQUE, pg 23505). */
export class EmailTakenError extends Error {
  constructor() {
    super("email déjà utilisé");
    this.name = "EmailTakenError";
  }
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1 h

// --- Amorçage : schéma prêt + 1er admin semé, une seule fois par process ----
// On ne branche PAS le bootstrap dans ensureSchema (lib/db.ts) pour éviter un
// cycle d'import db ↔ users : on l'enveloppe ici. L'échec du bootstrap est logué
// mais ne bloque pas l'app (un mauvais mot de passe admin ne doit pas tout casser) ;
// l'échec de création de schéma, lui, rejette (re-tenté au prochain appel).
let authReady: Promise<void> | null = null;

function ensureAuthReady(): Promise<void> {
  if (!authReady) {
    authReady = (async () => {
      await ensureSchema();
      try {
        await bootstrapAdminFromEnv();
      } catch (err) {
        console.error("[bootstrap] échec du semis admin (non bloquant) :", err);
      }
    })().catch((err) => {
      authReady = null;
      throw err;
    });
  }
  return authReady;
}

function rowToUser(r: {
  id: string | number;
  email: string;
  role: string;
  name: string | null;
  created_at: Date;
}): User {
  return {
    id: Number(r.id),
    email: r.email,
    role: r.role as Role,
    name: r.name,
    createdAt: r.created_at.toISOString(),
  };
}

// --- Utilisateurs -----------------------------------------------------------

export async function createUser(input: {
  email: string;
  name: string | null;
  passwordHash: string;
  role?: Role;
}): Promise<User> {
  await ensureAuthReady();
  const email = input.email.trim().toLowerCase();
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, role, name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, name, created_at`,
      [email, input.passwordHash, input.role ?? "customer", input.name],
    );
    return rowToUser(rows[0]);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "23505") {
      throw new EmailTakenError();
    }
    throw e;
  }
}

/** Renvoie l'utilisateur ET son hash séparément : le hash ne doit jamais
 * remonter au-delà de la couche d'auth. */
export async function getUserByEmail(
  email: string,
): Promise<{ user: User; passwordHash: string } | null> {
  await ensureAuthReady();
  const { rows } = await pool.query(
    `SELECT id, email, role, name, created_at, password_hash
       FROM users WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
  if (!rows[0]) return null;
  return { user: rowToUser(rows[0]), passwordHash: rows[0].password_hash as string };
}

export async function getUserById(id: number): Promise<User | null> {
  await ensureAuthReady();
  const { rows } = await pool.query(
    `SELECT id, email, role, name, created_at FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function updateUserName(id: number, name: string | null): Promise<void> {
  await ensureAuthReady();
  await pool.query(
    `UPDATE users SET name = $2, updated_at = now() WHERE id = $1`,
    [id, name],
  );
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<void> {
  await ensureAuthReady();
  await pool.query(
    `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`,
    [id, passwordHash],
  );
}

// --- Sessions ---------------------------------------------------------------

export async function insertSession(
  token: string,
  userId: number,
  expiresAt: Date,
): Promise<void> {
  await ensureAuthReady();
  await pool.query(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expiresAt.toISOString()],
  );
}

/** Résout l'utilisateur d'une session valide (token connu ET non expiré). */
export async function getSessionUser(token: string): Promise<User | null> {
  await ensureAuthReady();
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.role, u.name, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now()`,
    [token],
  );
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function deleteSession(token: string): Promise<void> {
  await ensureAuthReady();
  await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
}

export async function deleteAllSessionsForUser(userId: number): Promise<void> {
  await ensureAuthReady();
  await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
}

/** Purge opportuniste des sessions et tokens de reset expirés (zéro cron). */
export async function deleteExpiredSessions(): Promise<void> {
  await ensureAuthReady();
  await pool.query(`DELETE FROM sessions WHERE expires_at < now()`);
  await pool.query(`DELETE FROM password_reset_tokens WHERE expires_at < now()`);
}

// --- Réinitialisation de mot de passe --------------------------------------

/** Crée un token de reset (expire dans 1 h) et renvoie sa valeur BRUTE (pour le
 * lien e-mail). Seule l'empreinte sha256 est stockée. */
export async function createResetToken(userId: number): Promise<string> {
  await ensureAuthReady();
  const raw = newToken();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await pool.query(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, $3)`,
    [sha256(raw), userId, expiresAt.toISOString()],
  );
  return raw;
}

/** Renvoie l'id utilisateur si le token est valide (non expiré, non consommé). */
export async function getResetUserId(rawToken: string): Promise<number | null> {
  await ensureAuthReady();
  const { rows } = await pool.query(
    `SELECT user_id FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [sha256(rawToken)],
  );
  return rows[0] ? Number(rows[0].user_id) : null;
}

export async function consumeResetToken(rawToken: string): Promise<void> {
  await ensureAuthReady();
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1`,
    [sha256(rawToken)],
  );
}

// --- Administration ---------------------------------------------------------

/** Sème (ou met à jour) le 1er admin depuis les variables d'environnement.
 * Idempotent. Crée le compte s'il manque ; force role='admin' ; ne réécrit le
 * mot de passe que si ADMIN_PASSWORD_RESET=true (rotation ponctuelle). */
export async function bootstrapAdminFromEnv(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return; // pas d'admin auto en dev

  const hash = hashPassword(password);
  const forcePassword = process.env.ADMIN_PASSWORD_RESET === "true";
  await pool.query(
    `INSERT INTO users (email, password_hash, role, name)
       VALUES ($1, $2, 'admin', $3)
     ON CONFLICT (email) DO UPDATE
       SET role = 'admin',
           password_hash = CASE WHEN $4 THEN EXCLUDED.password_hash ELSE users.password_hash END,
           updated_at = now()`,
    [email, hash, "Admin", forcePassword],
  );
  console.info(`[bootstrap] admin assuré : ${email}`);
}

/** Promeut un compte existant en admin (helper pour les admins suivants). */
export async function promoteToAdmin(email: string): Promise<void> {
  await ensureAuthReady();
  await pool.query(
    `UPDATE users SET role = 'admin', updated_at = now() WHERE email = $1`,
    [email.trim().toLowerCase()],
  );
}
