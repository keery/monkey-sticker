// Thème visuel des emails — palette « nuit showroom » convertie en hex (les
// clients mail ne comprennent ni oklch ni les variables CSS), + petits
// utilitaires de rendu (échappement HTML, formatage monétaire).

import type { EmailLocale } from "./types";

/** Palette de marque (hex figés, dérivés de globals.css). */
export const C = {
  night: "#0f0a06", // fond extérieur
  card: "#19140e", // carte de contenu
  line: "#2b2118", // filets / bordures
  ivory: "#f4f0e7", // texte principal
  ivoryDim: "#b2aa9d", // texte secondaire
  flame: "#fd7234", // accent
  flameDeep: "#df500c", // accent foncé (hover, dégradés)
  flameInk: "#1a0d05", // texte sur fond flamme (quasi noir chaud)
  flameTint: "#2a1509", // fond de pastille discret
} as const;

/** Pile de polices sûre pour l'email (aucune police custom fiable en mail). */
export const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Échappe le HTML des données interpolées (nom client, options…). */
export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BCP47: Record<EmailLocale, string> = {
  en: "en-IE",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  nl: "nl-NL",
  pt: "pt-PT",
};

/** Montant en euros, formaté selon la langue du destinataire. */
export function money(amount: number, locale: EmailLocale): string {
  return new Intl.NumberFormat(BCP47[locale] ?? "en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
