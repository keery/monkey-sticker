// Configuration i18n centrale — locales supportées et helpers de chemin.
//
// L'ANGLAIS est la langue par défaut, servie SANS préfixe à la racine
// (monkeysticker.fr/products/x). Les autres langues sont préfixées
// (/fr, /es, /de, /nl, /pt). Le proxy (proxy.ts) réécrit en interne les
// chemins anglais vers /en/... pour qu'ils tombent sur app/[lang], tandis que
// l'URL visible reste sans préfixe.

export const LOCALES = ["en", "fr", "es", "de", "nl", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Libellés natifs affichés dans le sélecteur de langue.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  nl: "Nederlands",
  pt: "Português",
};

// Emoji drapeau — purement décoratif dans le sélecteur.
export const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  fr: "🇫🇷",
  es: "🇪🇸",
  de: "🇩🇪",
  nl: "🇳🇱",
  pt: "🇵🇹",
};

// Locale de formatage Intl (prix, dates, tri).
export const LOCALE_INTL: Record<Locale, string> = {
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  nl: "nl-NL",
  pt: "pt-PT",
};

// Locale Stripe Checkout (sous-ensemble supporté par Stripe : tous présents).
export const LOCALE_STRIPE: Record<Locale, string> = {
  en: "en",
  fr: "fr",
  es: "es",
  de: "de",
  nl: "nl",
  pt: "pt",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Préfixe d'URL d'une locale : "" pour l'anglais (défaut), "/xx" sinon. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/**
 * Construit un chemin localisé.
 *   localePath("/products/x", "fr") -> "/fr/products/x"
 *   localePath("/products/x", "en") -> "/products/x"
 *   localePath("/", "de")           -> "/de"
 * Les URLs externes (http…, mailto:, #ancre) sont renvoyées telles quelles.
 */
export function localePath(path: string, locale: Locale): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return localePrefix(locale) + clean || "/";
}
