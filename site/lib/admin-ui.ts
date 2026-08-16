// Vocabulaire visuel de l'atelier (admin) — une seule source pour que chaque
// écran parle la même langue : même bouton, même champ, même statut partout.
// Palette « nuit showroom » du site (globals.css) : charbon chaud + accent flamme.

import type { Locale } from "./i18n/config";

// --- Traductions ------------------------------------------------------------
// Le français est la langue de base (champs racine, saisis par l'atelier) ;
// l'atelier édite ici les autres langues. Libellés en français (admin FR only).
export const TRANSLATION_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "Anglais" },
  { code: "es", label: "Espagnol" },
  { code: "de", label: "Allemand" },
  { code: "nl", label: "Néerlandais" },
  { code: "pt", label: "Portugais" },
];

// --- Surfaces ---------------------------------------------------------------
export const panel = "rounded-2xl border border-white/10 bg-white/[0.02]";
export const panelInset = "rounded-xl border border-white/10 bg-white/[0.03]";

// --- Champs de formulaire ---------------------------------------------------
export const field =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-ivory placeholder:text-ivory-dim/45 outline-none transition-colors duration-150 focus:border-flame/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-flame/25";

// --- Boutons ----------------------------------------------------------------
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-flame px-5 py-2.5 text-sm font-semibold text-night transition-[background-color,transform,opacity] duration-150 hover:bg-flame-deep active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame/50 focus-visible:ring-offset-2 focus-visible:ring-offset-night";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-ivory transition-colors duration-150 hover:border-white/30 hover:bg-white/[0.05] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25";
export const btnGhostSm =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-ivory transition-colors duration-150 hover:border-white/30 hover:bg-white/[0.05] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25";
export const btnDangerSm =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-400/25 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors duration-150 hover:border-rose-400/45 hover:bg-rose-500/10 disabled:pointer-events-none disabled:opacity-40";

// --- Étiquettes -------------------------------------------------------------
export const chip =
  "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-ivory-dim";
export const label =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-ivory-dim/70";

// --- Statuts de commande (production / logistique) --------------------------
export const ORDER_STATUS: Record<
  string,
  { label: string; cls: string; dot: string }
> = {
  new: {
    label: "À imprimer",
    cls: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
  },
  printed: {
    label: "Imprimée",
    cls: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    dot: "bg-sky-400",
  },
  shipped: {
    label: "Expédiée",
    cls: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
};

// --- Statuts de paiement ----------------------------------------------------
export const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: {
    label: "Paiement en attente",
    cls: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  },
  paid: {
    label: "Payée",
    cls: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90",
  },
  failed: {
    label: "Paiement échoué",
    cls: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  },
  expired: {
    label: "Expirée",
    cls: "border-white/15 bg-white/[0.05] text-ivory-dim",
  },
  refunded: {
    label: "Remboursée",
    cls: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  },
};
