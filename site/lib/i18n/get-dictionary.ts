import "server-only";
import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Dictionary } from "./dictionary";
import en from "./dictionaries/en.json";

// Chargement paresseux par locale : seul le dictionnaire demandé est importé.
// Tout tourne côté serveur — la taille des JSON n'impacte pas le bundle client
// (seul le dictionnaire résolu est sérialisé vers le client, via I18nProvider).
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default as Dictionary),
  fr: () => import("./dictionaries/fr.json").then((m) => m.default as Dictionary),
  es: () => import("./dictionaries/es.json").then((m) => m.default as Dictionary),
  de: () => import("./dictionaries/de.json").then((m) => m.default as Dictionary),
  nl: () => import("./dictionaries/nl.json").then((m) => m.default as Dictionary),
  pt: () => import("./dictionaries/pt.json").then((m) => m.default as Dictionary),
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Fusion profonde d'une locale sur l'anglais (source de vérité de la structure) :
// toute clé absente d'une traduction retombe sur le libellé anglais plutôt que de
// renvoyer `undefined` (qui ferait planter le rendu, ex. dict.product.from). Les
// valeurs non-objet et les tableaux sont remplacés en bloc.
function mergeOntoBase<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : (override as T);
  }
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    out[key] = key in base ? mergeOntoBase(base[key], override[key]) : override[key];
  }
  return out as T;
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  if (locale === DEFAULT_LOCALE) return en as Dictionary;
  const dict = await (loaders[locale] ?? loaders.en)();
  // complète les traductions partielles avec les libellés anglais manquants
  return mergeOntoBase(en as Dictionary, dict);
}
