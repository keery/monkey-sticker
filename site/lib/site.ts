// Configuration centrale du site — adapter librement au branding final.

export const SITE = {
  name: "Monkey Sticker",
  logo: "/logo-monkey-sticker.webp",
  tagline: "Ta carte, en mieux.",
  currency: "EUR",
  locale: "fr-FR",
  announcement: "1 acheté = 1 offert sur tous les stickers",
  announcementCta: "J'en profite",
  rating: { value: 4.8, count: 2847 },
  social: {
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    tiktok: "https://tiktok.com",
  },
  contactEmail: "hello@monkeysticker.fr",
} as const;

// Cotes réelles de la carte ISO ID-1 et de la fenêtre puce (voir presets.toml)
// — utilisées par l'aperçu produit et le customizer pour un rendu exact.
export const CARD = {
  widthMm: 85.6,
  heightMm: 53.98,
  cornerRadiusMm: 3.18,
  chipWindow: { xMm: 7.0, yMm: 16.0, wMm: 16.0, hMm: 16.0, rMm: 1.8 },
  ratio: 85.6 / 53.98,
} as const;

// Les cartes n'ont pas toutes le même module puce : grande plaque 8 contacts
// (presque carrée) ou petite plaque 6 contacts (plus large que haute, la plus
// courante — cartes récentes). La fenêtre découpée s'adapte ; « sans puce »
// couvre badges et cartes de transport.
// - large : fenêtre nominale sourcée dans presets.toml ([window.nominal]).
// - small : dérivée du même centre contacts (15 ; 24) avec la même garde.
//   Cote de production à valider dans presets.toml avant découpe.
export type ChipSize = "large" | "small" | "none";

export interface ChipWindow {
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  rMm: number;
}

export const CHIP_WINDOWS: Record<Exclude<ChipSize, "none">, ChipWindow> = {
  large: { xMm: 7.0, yMm: 16.0, wMm: 16.0, hMm: 16.0, rMm: 1.8 },
  small: { xMm: 8.0, yMm: 18.5, wMm: 14.0, hMm: 11.0, rMm: 1.8 },
} as const;

// Plaques contact réelles (le doré visible), centrées dans leur fenêtre —
// utilisées par tous les dessins de puce (aperçus, sélecteur, canvas).
// Les deux sont PLUS LARGES QUE HAUTES (carte en paysage) :
// - grande : plaque 8 contacts ~12,6 × 11,4 mm, presque carrée (gabarit
//   classique type M8.4 ; les modules récents type Infineon S-COM8.4 font
//   11 × 8,3 mm, toujours en paysage) ;
// - petite : plaque 6 contacts ~10,6 × 8,0 mm, nettement plus large que
//   haute (forme confirmée par les guides des découpeurs de skins).
export const CHIP_PLATES: Record<Exclude<ChipSize, "none">, { wMm: number; hMm: number }> = {
  large: { wMm: 12.6, hMm: 11.4 },
  small: { wMm: 10.6, hMm: 8.0 },
} as const;

export const CHIP_SIZES: {
  key: ChipSize;
  label: string;
  optionValue: string; // valeur stockée dans les options du panier
  hint: string;
  tag?: string;
}[] = [
  {
    key: "small",
    label: "Petite puce",
    optionValue: "Petite",
    hint: "plus large que haute, ~11 × 8 mm",
    tag: "La plus courante",
  },
  {
    key: "large",
    label: "Grande puce",
    optionValue: "Grande",
    hint: "presque carrée, ~13 × 11 mm",
  },
  {
    key: "none",
    label: "Sans puce",
    optionValue: "Aucune",
    hint: "badge, carte de transport",
  },
];
