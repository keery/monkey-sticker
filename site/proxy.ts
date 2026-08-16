// Proxy Next.js 16 (ex-middleware) — routage i18n.
//
// L'anglais est la langue par défaut, servie SANS préfixe. Les autres langues
// sont préfixées (/fr, /es, /de, /nl, /pt).
//
// Comportement :
//   - /fr, /es… (préfixe non-défaut)  → servi tel quel, cookie mémorisé
//   - /en/…  (préfixe défaut explicite) → redirigé vers la racine sans préfixe
//   - /…      (sans préfixe)            → si la langue préférée (cookie, sinon
//                                          Accept-Language) n'est pas l'anglais,
//                                          redirection vers /xx/… ; sinon
//                                          réécriture interne vers /en/… pour
//                                          tomber sur app/[lang] (URL inchangée).
//
// Le matcher exclut api, admin (back-office FR), _next et tout fichier statique.

import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { matchLocale } from "@/lib/i18n/detect";

const COOKIE = "NEXT_LOCALE";
const ONE_YEAR = 60 * 60 * 24 * 365;

function withCookie(res: NextResponse, locale: string): NextResponse {
  res.cookies.set(COOKIE, locale, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
  return res;
}

// Transmet le chemin « nu » (sans préfixe de locale) aux composants serveur via
// un en-tête de requête, pour construire les alternates hreflang par page.
function reqHeaders(request: NextRequest, barePath: string) {
  const h = new Headers(request.headers);
  h.set("x-pathname", barePath || "/");
  return { request: { headers: h } };
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1]; // "" pour "/"

  // 1. Déjà préfixé par une locale non-défaut → servir tel quel.
  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    const barePath = pathname.slice(first.length + 1) || "/";
    const res = NextResponse.next(reqHeaders(request, barePath));
    return request.cookies.get(COOKIE)?.value === first ? res : withCookie(res, first);
  }

  // 2. Préfixe /en explicite → canonicaliser vers la racine sans préfixe.
  if (first === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
    return withCookie(NextResponse.redirect(url), DEFAULT_LOCALE);
  }

  // 3. Sans préfixe : déterminer la langue préférée.
  const cookie = request.cookies.get(COOKIE)?.value;
  const preferred = isLocale(cookie)
    ? cookie
    : matchLocale(request.headers.get("accept-language"));

  if (preferred !== DEFAULT_LOCALE) {
    // Rediriger vers la version préfixée (ex. /de/products/x).
    const url = request.nextUrl.clone();
    url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
    return withCookie(NextResponse.redirect(url), preferred);
  }

  // 4. Anglais : réécriture interne vers /en/… (URL visible inchangée).
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.rewrite(url, reqHeaders(request, pathname));
  return cookie === DEFAULT_LOCALE ? res : withCookie(res, DEFAULT_LOCALE);
}

export const config = {
  // Exclut api, admin (back-office FR uniquement), _next et tout fichier
  // statique (public/, images, favicon… reconnus par leur point).
  matcher: ["/((?!api|admin|_next|.*\\..*).*)"],
};
