// Client Postgres partagé (pool de connexions) — source de vérité unique de
// toutes les données du site (catalogue, commandes, propositions, newsletter).
// NE PAS importer côté client.
//
// Le pool est mémorisé sur globalThis pour survivre au hot-reload de Next :
// sinon chaque recompilation en dev ouvrirait un nouveau pool et finirait par
// épuiser les connexions du serveur.

import { Pool } from "pg";

const CONNECTION_STRING =
  process.env.DATABASE_URL ?? "postgres://flapy:flapy@localhost:5434/flapy";

// SSL : la plupart des Postgres managés (Neon, Supabase, RDS, Railway…) l'exigent.
// Activé automatiquement dès que l'hôte n'est pas local. Override possible :
//   PGSSL=disable  → jamais de SSL (base locale/interne)
//   PGSSL=require  → force le SSL (sans vérifier le certificat)
function sslConfig(): false | { rejectUnauthorized: boolean } {
  if (process.env.PGSSL === "disable") return false;
  if (process.env.PGSSL === "require") return { rejectUnauthorized: false };
  try {
    const host = new URL(CONNECTION_STRING).hostname;
    const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
    return local ? false : { rejectUnauthorized: false };
  } catch {
    return false;
  }
}

const globalForPg = globalThis as unknown as { _flapyPool?: Pool };

export const pool =
  globalForPg._flapyPool ??
  new Pool({ connectionString: CONNECTION_STRING, ssl: sslConfig() });

if (process.env.NODE_ENV !== "production") globalForPg._flapyPool = pool;

// Schéma complet, appliqué une seule fois par process, de façon idempotente.
// Rend l'app auto-suffisante même si l'init SQL du conteneur n'a pas tourné
// (ex. base managée provisionnée à vide en production).
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id         BIGSERIAL PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    source     TEXT NOT NULL DEFAULT 'site',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS categories (
    handle TEXT PRIMARY KEY,
    seq    BIGSERIAL,
    data   JSONB NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    handle TEXT PRIMARY KEY,
    seq    BIGSERIAL,
    data   JSONB NOT NULL
  );

  CREATE SEQUENCE IF NOT EXISTS order_number_seq START 10001;

  CREATE TABLE IF NOT EXISTS orders (
    id                TEXT PRIMARY KEY,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    stripe_session_id TEXT UNIQUE,
    data              JSONB NOT NULL
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id         TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status     TEXT NOT NULL DEFAULT 'new',
    data       JSONB NOT NULL
  );

  -- Comptes & authentification -------------------------------------------
  -- role : TEXT libre ('admin' | 'customer' | …) pour ajouter des rôles sans
  -- migration. users AVANT les tables qui la référencent (clés étrangères).
  CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer',
    name          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Sessions à état : token opaque haute entropie, validité vérifiée en base.
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id_idx    ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

  -- Réinitialisation de mot de passe : on stocke le HASH du token (jamais le
  -- token brut, présent uniquement dans le lien e-mail).
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS prt_expires_at_idx ON password_reset_tokens(expires_at);
`;

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((err) => {
        // en cas d'échec, autoriser une nouvelle tentative au prochain appel
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}
