import { SITE } from "./site";
import { DEFAULT_LOCALE, LOCALE_INTL, type Locale } from "./i18n/config";

// Formate un montant dans la devise du site, avec les conventions de la locale
// demandée (séparateurs, position du symbole). Repli sur la langue par défaut
// — utile pour l'admin, qui appelle sans locale.
export function formatPrice(amount: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(LOCALE_INTL[locale] ?? LOCALE_INTL[DEFAULT_LOCALE], {
    style: "currency",
    currency: SITE.currency,
  }).format(amount);
}
