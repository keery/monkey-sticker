import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

/**
 * Choisit la meilleure locale supportée d'après l'en-tête Accept-Language.
 * Dépendance-zéro (compatible runtime Edge du proxy).
 *   "fr-BE,fr;q=0.9,en;q=0.5" -> "fr"
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? parseFloat(qParam.split("=")[1]) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.tag && x.tag !== "*")
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (isLocale(tag)) return tag; // "fr"
    const primary = tag.split("-")[0]; // "fr-be" -> "fr"
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
