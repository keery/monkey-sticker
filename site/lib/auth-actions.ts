"use server";

// Server Actions d'authentification : inscription, connexion, déconnexion,
// mot de passe oublié / réinitialisation, profil. Retour { ok, error?, code? }
// pour un affichage propre côté client (jamais d'exception remontée au client).
//
// IMPORTANT : redirect() (next/navigation) lève NEXT_REDIRECT — toujours l'appeler
// HORS de tout try/catch, sinon la redirection est avalée.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUser, startSession, endSession } from "./auth";
import {
  createUser,
  getUserByEmail,
  updateUserName,
  updateUserPassword,
  createResetToken,
  getResetUserId,
  consumeResetToken,
  deleteAllSessionsForUser,
  deleteExpiredSessions,
  EmailTakenError,
} from "./users";
import { hashPassword, verifyPassword } from "./password";
import { sendPasswordResetEmail } from "./email";
import { rateLimit, resetRateLimit } from "./rate-limit";
import { siteOrigin } from "./site-origin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PW = 8;

export interface AuthResult {
  ok: boolean;
  error?: string;
  code?: "invalid" | "taken" | "credentials" | "throttled" | "server";
}

/** N'autorise que les chemins internes (anti open-redirect). */
function safeNext(next?: string): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/account";
}

async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  } catch {
    return "local";
  }
}

// --- Inscription ------------------------------------------------------------

export async function registerAction(
  input: { name?: string; email: string; password: string },
  next?: string,
): Promise<AuthResult> {
  const email = (input.email ?? "").trim().toLowerCase();
  const name = (input.name ?? "").trim().slice(0, 120) || null;
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, code: "invalid", error: "Adresse e-mail invalide." };
  }
  if (typeof input.password !== "string" || input.password.length < MIN_PW) {
    return { ok: false, code: "invalid", error: `Mot de passe : ${MIN_PW} caractères minimum.` };
  }

  try {
    const user = await createUser({
      email,
      name,
      passwordHash: hashPassword(input.password),
    });
    await startSession(user.id);
  } catch (e) {
    if (e instanceof EmailTakenError) {
      return { ok: false, code: "taken", error: "Un compte existe déjà avec cet e-mail." };
    }
    console.error("[auth] inscription échouée :", e);
    return { ok: false, code: "server", error: "Une erreur est survenue, réessaie." };
  }
  redirect(safeNext(next)); // hors try/catch
}

// --- Connexion --------------------------------------------------------------

export async function loginAction(
  email: string,
  password: string,
  next?: string,
): Promise<AuthResult> {
  const e = (email ?? "").trim().toLowerCase();
  const ip = await clientIp();

  // Throttle anti-force-brute (fenêtre glissante en mémoire).
  if (!rateLimit(`login:${e}:${ip}`)) {
    return {
      ok: false,
      code: "throttled",
      error: "Trop de tentatives. Réessaie dans quelques minutes.",
    };
  }

  const found = await getUserByEmail(e);
  // Temps de calcul comparable même sans compte (anti-énumération).
  const ok = found
    ? verifyPassword(password, found.passwordHash)
    : (hashPassword(password), false);

  if (!found || !ok) {
    return { ok: false, code: "credentials", error: "E-mail ou mot de passe incorrect." };
  }

  resetRateLimit(`login:${e}:${ip}`);
  await startSession(found.user.id);
  // Ménage opportuniste (zéro cron).
  deleteExpiredSessions().catch(() => {});
  redirect(safeNext(next)); // hors try/catch
}

// --- Déconnexion ------------------------------------------------------------

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

// --- Mot de passe oublié ----------------------------------------------------

export async function requestPasswordResetAction(email: string): Promise<{ ok: true }> {
  const e = (email ?? "").trim().toLowerCase();
  const ip = await clientIp();
  // Réponse TOUJOURS identique (anti-énumération), même si throttlé.
  if (rateLimit(`reset:${e}:${ip}`, 5, 15 * 60 * 1000) && EMAIL_RE.test(e) && e.length <= 254) {
    const found = await getUserByEmail(e);
    if (found) {
      try {
        const token = await createResetToken(found.user.id);
        const origin = await siteOrigin();
        await sendPasswordResetEmail(e, `${origin}/reset-password/${token}`);
      } catch (err) {
        console.error("[auth] envoi reset échoué :", err);
      }
    }
  }
  return { ok: true };
}

export async function resetPasswordAction(token: string, password: string): Promise<AuthResult> {
  if (typeof password !== "string" || password.length < MIN_PW) {
    return { ok: false, code: "invalid", error: `Mot de passe : ${MIN_PW} caractères minimum.` };
  }
  const userId = await getResetUserId(token);
  if (!userId) {
    return { ok: false, code: "invalid", error: "Lien expiré ou invalide." };
  }
  await updateUserPassword(userId, hashPassword(password));
  await consumeResetToken(token);
  await deleteAllSessionsForUser(userId); // déconnecte partout
  redirect("/login?reset=1"); // hors try/catch
}

// --- Profil -----------------------------------------------------------------

export async function updateProfileAction(name: string): Promise<AuthResult> {
  const user = await requireUser(); // garde autoritaire
  const clean = (name ?? "").trim().slice(0, 120) || null;
  await updateUserName(user.id, clean);
  return { ok: true };
}
