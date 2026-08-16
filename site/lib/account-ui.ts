// Vocabulaire visuel des écrans « compte » (connexion, inscription, espace
// client) — simples chaînes de classes Tailwind, importables côté client.
// Palette « nuit showroom » du site (globals.css) : charbon + accent flamme,
// aligné sur components/TrackOrderForm.tsx et le header.

export const authPanel =
  "rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8";

export const field =
  "w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-ivory placeholder:text-ivory-dim/70 outline-none focus:border-flame transition-colors";

export const fieldLabel =
  "block text-xs font-semibold uppercase tracking-wide text-ivory-dim mb-1.5";

export const btnPrimary =
  "w-full rounded-full bg-flame text-night py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors disabled:opacity-60";

export const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-ivory hover:border-ivory hover:bg-white/5 transition-colors";

export const authLink = "text-flame hover:text-flame-deep transition-colors";

export const errorText = "mt-3 text-sm text-red-400";
