import { LOCALE_INTL, type Locale } from "./config";

/**
 * Remplace les jetons {clé} d'un modèle par les valeurs fournies.
 *   interpolate("Bonjour {name}", { name: "Léo" }) -> "Bonjour Léo"
 */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * Sélectionne la forme plurielle correcte selon la locale (règles CLDR via
 * Intl.PluralRules), puis interpole. Les formes suivent les catégories CLDR
 * ("one", "other", éventuellement "many"…).
 *   plural("fr", 2, { one: "{count} offert", other: "{count} offerts" }, { count: 2 })
 */
export function plural(
  locale: Locale,
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>>,
  vars?: Record<string, string | number>,
): string {
  const rule = new Intl.PluralRules(LOCALE_INTL[locale]).select(count);
  const template = forms[rule] ?? forms.other ?? forms.one ?? "";
  return interpolate(template, { count, ...vars });
}
