// Origine publique du site pour construire des liens absolus (retour Stripe,
// liens de réinitialisation…). On privilégie l'origine réelle de la requête
// (marche en local comme derrière un proxy en prod) ; sinon NEXT_PUBLIC_SITE_URL.
// NE PAS importer côté client (utilise next/headers).

import { headers } from "next/headers";

export async function siteOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
  } catch {
    /* headers() indisponible hors requête */
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3022";
}
