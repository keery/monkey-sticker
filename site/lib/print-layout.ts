// Imposition A4 des feuilles de production.
//
// Anatomie d'une tuile imprimée (de haut en bas) :
//  1. Bande de branding (logo Monkey Sticker) — matrice, se retire.
//  2. Bande orange — matrice, se retire ; sépare le branding du fond perdu.
//  3. Zone d'artwork en GRAND FOND PERDU : l'artwork remplit TOUTE la largeur et
//     descend jusqu'au bas de la tuile. La carte (kiss-cut) est découpée au
//     MILIEU de ce fond perdu ; l'artwork déborde donc largement du trait de
//     coupe sur les 4 côtés → aucun liseré blanc possible et grosse marge de
//     tolérance pour la registration print & cut Silhouette.
//
// Les bandes branding + orange forment la « matrice » : on décolle la carte,
// elles partent avec le support et ne restent jamais sur la carte finale.
//
// La grille reste 2 × 3 (6 stickers/A4 max) avec les coins libres pour les
// repères print & cut que Silhouette Studio ajoute lui-même.

import { CARD, CHIP_SIZES, CHIP_WINDOWS, type ChipSize, type ChipWindow } from "./site";

export const SHEET_MM = { w: 210, h: 297 };
export const CARD_MM = { w: CARD.widthMm, h: CARD.heightMm }; // 85,6 × 53,98
export const CARD_CORNER_MM = CARD.cornerRadiusMm; // 3,18
// La fenêtre puce n'est plus une cote fixe : elle dépend de la taille choisie au
// panier. Voir chipWindowForOptions() plus bas.

// Bandes de matrice (haut de la tuile, se retirent avec le support).
export const BAND_MM = 13; // bande branding (logo)
export const ORANGE_MM = 3.5; // bande orange sous le branding

// Fond perdu autour de la carte : distances bord de tuile → trait de coupe.
// L'artwork remplit toute cette zone, la carte est découpée en son milieu.
export const SIDE_MM = 4.5; // gauche / droite
export const TOP_BLEED_MM = 6; // au-dessus de la carte (sous la bande orange)
export const BOTTOM_BLEED_MM = 6; // sous la carte, jusqu'au bas de la tuile

// Tuile imprimée = le « sticker » complet (branding + orange + fond perdu + carte).
export const TILE_MM = {
  w: CARD_MM.w + 2 * SIDE_MM, // 94,6
  h: BAND_MM + ORANGE_MM + TOP_BLEED_MM + CARD_MM.h + BOTTOM_BLEED_MM, // 82,48
};
// Coin haut-gauche de la carte (kiss-cut) dans la tuile.
export const CARD_POS_MM = { x: SIDE_MM, y: BAND_MM + ORANGE_MM + TOP_BLEED_MM }; // (4,5 ; 22,5)
// Zone d'artwork (fond perdu) : pleine largeur, du bas de la bande orange
// jusqu'au bord bas de la tuile.
export const ART_POS_MM = { x: 0, y: BAND_MM + ORANGE_MM }; // (0 ; 16,5)
export const ART_MM = { w: TILE_MM.w, h: TILE_MM.h - (BAND_MM + ORANGE_MM) }; // 94,6 × 65,98
// Fond perdu minimal effectif (plus petit débord autour de la carte), pour
// l'affichage/documentation.
export const BLEED_MM = Math.min(SIDE_MM, TOP_BLEED_MM, BOTTOM_BLEED_MM); // 4,5

export const GAP_MM = 4;
export const COLS = 2;
export const ROWS = 3;
export const PER_SHEET = COLS * ROWS; // 6 stickers max par A4

export const X0_MM = (SHEET_MM.w - (COLS * TILE_MM.w + (COLS - 1) * GAP_MM)) / 2; // 8,4
export const Y0_MM = 22; // sous la zone de repères Silhouette
// Vérif hauteur : 22 + 3×82,48 + 2×4 = 277,44 mm ≤ 297 (≈ 19,6 mm de marge basse).

export function slotPosition(i: number): { x: number; y: number } {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return {
    x: X0_MM + col * (TILE_MM.w + GAP_MM),
    y: Y0_MM + row * (TILE_MM.h + GAP_MM),
  };
}

export function chunkIntoSheets<T>(units: T[]): T[][] {
  const sheets: T[][] = [];
  for (let i = 0; i < units.length; i += PER_SHEET) {
    sheets.push(units.slice(i, i + PER_SHEET));
  }
  return sheets;
}

// --- Fichier de découpe Silhouette -----------------------------------------
// Généré depuis CETTE source : les tracés de coupe partagent exactement les
// positions de l'artwork imprimé (slotPosition + CARD_POS_MM), donc aucun
// décalage possible entre impression et découpe. Remplace la grille cardcut
// `a4_silhouette`, qui ne partageait pas cette disposition.

// Valeur d'option panier (« Grande » / « Petite » / « Aucune ») -> taille puce.
const CHIP_BY_OPTION: Record<string, ChipSize> = Object.fromEntries(
  CHIP_SIZES.map((c) => [c.optionValue, c.key]),
);

// Fenêtre puce à découper pour une unité, selon la taille choisie au panier
// (option « Puce »). null = sans puce -> aucune fenêtre. Défaut historique :
// grande, pour les rares commandes sans l'option renseignée.
export function chipWindowForOptions(options?: Record<string, string>): ChipWindow | null {
  const raw = options?.Puce;
  const size: ChipSize = (raw && CHIP_BY_OPTION[raw]) || "large";
  return size === "none" ? null : CHIP_WINDOWS[size];
}

const CUT_COLOR = "#FF0000";

function cutRect(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" ` +
    `width="${w.toFixed(3)}" height="${h.toFixed(3)}" ` +
    `rx="${r.toFixed(3)}" ry="${r.toFixed(3)}"/>`
  );
}

/** SVG de découpe d'UNE feuille A4 (viewBox en mm) : contour carte + fenêtre
 * puce par emplacement, aux positions exactes de l'artwork imprimé. À importer
 * dans Silhouette Studio, qui ajoute lui-même ses repères print & cut. */
export function buildSheetCutSvg(
  unitsOnSheet: { options?: Record<string, string> }[],
): string {
  const shapes: string[] = [];
  unitsOnSheet.forEach((u, i) => {
    const pos = slotPosition(i);
    const cx = pos.x + CARD_POS_MM.x;
    const cy = pos.y + CARD_POS_MM.y;
    shapes.push(cutRect(cx, cy, CARD_MM.w, CARD_MM.h, CARD_CORNER_MM));
    const win = chipWindowForOptions(u.options);
    if (win) shapes.push(cutRect(cx + win.xMm, cy + win.yMm, win.wMm, win.hMm, win.rMm));
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_MM.w}mm" ` +
      `height="${SHEET_MM.h}mm" viewBox="0 0 ${SHEET_MM.w} ${SHEET_MM.h}">`,
    `  <g fill="none" stroke="${CUT_COLOR}" stroke-width="0.1">`,
    ...shapes.map((s) => `    ${s}`),
    "  </g>",
    "</svg>",
    "",
  ].join("\n");
}
