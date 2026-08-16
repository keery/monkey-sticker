// Copie partagée par tous les emails (pied de page, libellés de totaux, etc.).
// FR + EN pour l'instant ; les autres langues retombent sur l'anglais (voir
// AGENTS.md). Ajouter une langue = compléter ces objets + ceux des templates.

import { SITE } from "@/lib/site";
import { pick, type EmailLocale } from "./types";

export const SITE_NAME = SITE.name;
export const CONTACT_EMAIL = SITE.contactEmail;

export interface CommonCopy {
  tagline: string;
  contact: string; // précède l'adresse e-mail
  rights: string;
  order: string; // libellé « Commande »
  totals: {
    subtotal: string;
    discount: string;
    shipping: string;
    free: string;
    total: string;
  };
}

const COMMON: Partial<Record<EmailLocale, CommonCopy>> = {
  en: {
    tagline: "Your bank card, but better.",
    contact: "A question? Write to us at",
    rights: "All rights reserved.",
    order: "Order",
    totals: {
      subtotal: "Subtotal",
      discount: "1 bought = 1 free",
      shipping: "Shipping",
      free: "Free",
      total: "Total",
    },
  },
  fr: {
    tagline: "Ta carte bancaire, en mieux.",
    contact: "Une question ? Écris-nous à",
    rights: "Tous droits réservés.",
    order: "Commande",
    totals: {
      subtotal: "Sous-total",
      discount: "1 acheté = 1 offert",
      shipping: "Livraison",
      free: "Offerte",
      total: "Total",
    },
  },
};

export function common(locale: EmailLocale): CommonCopy {
  return pick(COMMON, locale);
}
