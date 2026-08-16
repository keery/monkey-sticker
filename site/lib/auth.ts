// Cœur de l'authentification : cookie de session, résolution de l'utilisateur
// courant, et gardes (requireUser / requireAdmin / getAdminOr403).
// NE PAS importer côté client — utilise next/headers (cookies serveur) et la base.
//
// Sessions à ÉTAT : le cookie ne porte qu'un token opaque, toute la validité est
// vérifiée en base (aucun secret à signer, donc aucun SESSION_SECRET).

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { newToken } from "./password";
import {
  getSessionUser,
  insertSession,
  deleteSession,
  type User,
} from "./users";

export type { User, Role } from "./users";

// Constante partagée en dur avec proxy.ts (qui ne peut importer ni la base ni
// ce module). Ne pas piloter par variable d'env : proxy ne la lirait pas.
export const SESSION_COOKIE = "ms_session";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

const isProd = process.env.NODE_ENV === "production";

// --- Cookie de session ------------------------------------------------------

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd, // HTTPS obligatoire en prod ; http toléré en local
    sameSite: "lax", // bloque le POST cross-site (CSRF) mais survit au retour de Stripe
    path: "/",
    expires: expiresAt,
  });
}

async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// --- Cycle de vie de session (appelé depuis des server actions) -------------

/** Ouvre une session pour un utilisateur : crée le token, la ligne en base, et
 * pose le cookie. À n'appeler que dans une server action / route handler. */
export async function startSession(userId: number): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await insertSession(token, userId, expiresAt);
  await setSessionCookie(token, expiresAt);
}

/** Ferme la session courante : supprime la ligne et efface le cookie. */
export async function endSession(): Promise<void> {
  const token = await readSessionToken();
  if (token) await deleteSession(token);
  await clearSessionCookie();
}

// --- Résolution de l'utilisateur courant + gardes --------------------------

/** Utilisateur courant, ou null. Mémoïsé par passe de rendu (React cache) →
 * une seule requête base par requête HTTP. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  return getSessionUser(token);
});

/** Exige un utilisateur connecté ; sinon redirige vers /login. */
export async function requireUser(next = "/account"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Exige un admin ; redirige /login si anonyme, / si connecté sans le rôle. */
export async function requireAdmin(next = "/admin"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.role !== "admin") redirect("/");
  return user;
}

/** Variante pour les route handlers (téléchargements) : renvoie l'admin, ou une
 * Response 401/403 à retourner directement. */
export async function getAdminOr403(): Promise<User | Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role !== "admin") return new Response("Forbidden", { status: 403 });
  return user;
}
