// Résolution du contenu catalogue (noms/descriptions produits, titres de
// catégories) selon la locale.
//
// La LANGUE DE BASE est le français : c'est ce que l'atelier saisit dans les
// champs racine (name, description, title…). Les autres langues sont stockées
// dans le bloc `i18n` de chaque produit/catégorie. À défaut de traduction, on
// retombe sur la langue de base — jamais de champ vide affiché.

import type { Locale } from "./config";
import type { Category, Product } from "../products";

export const CATALOG_BASE_LOCALE: Locale = "fr";

export interface LocalizedProduct {
  name: string;
  description?: string;
  badge?: string;
}

export function localizedProduct(product: Product, locale: Locale): LocalizedProduct {
  if (locale === CATALOG_BASE_LOCALE) {
    return { name: product.name, description: product.description, badge: product.badge };
  }
  const t = product.i18n?.[locale];
  return {
    name: t?.name ?? product.name,
    description: t?.description ?? product.description,
    badge: t?.badge ?? product.badge,
  };
}

export function localizedCategory(category: Category, locale: Locale): { title: string } {
  if (locale === CATALOG_BASE_LOCALE) return { title: category.title };
  return { title: category.i18n?.[locale]?.title ?? category.title };
}
