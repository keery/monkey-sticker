// Placement non destructif d'un artwork réel sur la carte.
//
// Un SEUL repère (viewBox en dixièmes de mm, identique à CardDesign : 856×540)
// et une SEULE formule de transform sont partagés par les trois rendus :
//   · l'aperçu / la vitrine (SVG <image>, via svgArtTransform)
//   · l'éditeur admin (le même SVG, rendu interactif)
//   · l'impression (canvas 2D, via applyArtTransformToCanvas)
// → ce que l'atelier cadre dans l'admin est exactement ce qui s'affiche et
//   s'imprime, sans jamais passer par un autre logiciel.

import type { ImageTransform } from "./products";
import { CARD, CARD_NOTCH } from "./site";

// Repère commun (dixièmes de mm) — mêmes dimensions que CardDesign.
const W = Math.round(CARD.widthMm * 10); // 856
const H = Math.round(CARD.heightMm * 10); // 540
export const ART_VIEWBOX = { w: W, h: H } as const;

export const IDENTITY_TRANSFORM: ImageTransform = { scale: 1, x: 0, y: 0, rotation: 0 };

/** Vrai si le transform ne modifie rien (= cover centré d'origine). */
export function isIdentityTransform(t?: ImageTransform | null): boolean {
  return !t || (t.scale === 1 && t.x === 0 && t.y === 0 && t.rotation === 0);
}

function round(n: number, p = 1000): number {
  return Math.round(n * p) / p;
}

/** Valide et borne un transform (venu du formulaire ou du JSON stocké). */
export function normalizeTransform(raw: unknown): ImageTransform {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  // rotation ramenée dans (-180, 180]
  let rotation = num(o.rotation, 0) % 360;
  if (rotation > 180) rotation -= 360;
  if (rotation <= -180) rotation += 360;
  return {
    scale: round(clamp(num(o.scale, 1), 0.1, 10)),
    x: round(clamp(num(o.x, 0), -3, 3)),
    y: round(clamp(num(o.y, 0), -3, 3)),
    rotation: round(rotation),
  };
}

// Silhouette de la carte (coins arrondis + encoche optionnelle) sous forme d'un
// `d` de <path>, dans un repère `w`×`h`. Deux usages :
//   · w = h = 1 → coordonnées objectBoundingBox pour un `clip-path` CSS
//     responsive (l'encoche reste ronde car les rayons sont donnés séparément en
//     x et en y, ÷ largeur / ÷ hauteur, puis réétirés par le ratio de la carte) ;
//   · w = 856, h = 540 → repère userSpace du SVG CardDesign (dixièmes de mm).
// L'encoche est un demi-cercle concave sur le bord droit (voir CARD_NOTCH) ;
// parcours horaire → le repli vers l'intérieur se fait avec sweep-flag 0.
export function cardSilhouetteD(notch: boolean, w = 1, h = 1): string {
  const p = 100000; // arrondi fin (les coords objectBoundingBox valent < 1)
  const rr = (n: number) => Math.round(n * p) / p;
  const crx = rr((CARD.cornerRadiusMm / CARD.widthMm) * w);
  const cry = rr((CARD.cornerRadiusMm / CARD.heightMm) * h);
  const rx = rr((CARD_NOTCH.rMm / CARD.widthMm) * w);
  const ry = rr((CARD_NOTCH.rMm / CARD.heightMm) * h);
  const cy = rr((CARD_NOTCH.cyMm / CARD.heightMm) * h);
  const W = rr(w);
  const H = rr(h);
  const rightEdge = notch
    ? `V ${rr(cy - ry)} A ${rx} ${ry} 0 0 0 ${W} ${rr(cy + ry)} V ${rr(H - cry)}`
    : `V ${rr(H - cry)}`;
  return [
    `M ${crx} 0`,
    `H ${rr(W - crx)}`,
    `A ${crx} ${cry} 0 0 1 ${W} ${cry}`,
    rightEdge,
    `A ${crx} ${cry} 0 0 1 ${rr(W - crx)} ${H}`,
    `H ${crx}`,
    `A ${crx} ${cry} 0 0 1 0 ${rr(H - cry)}`,
    `V ${cry}`,
    `A ${crx} ${cry} 0 0 1 ${crx} 0`,
    `Z`,
  ].join(" ");
}

/** Chaîne `transform` du <g> SVG plaçant l'image dans le repère `w`×`h`.
 * Ordre géométrique (le plus à droite s'applique en premier aux points) :
 * recentrage → scale → rotation → recentrage inverse → pan. Le pan est donc
 * appliqué dans le repère carte non tourné (déplacement « à l'écran »). */
export function svgArtTransform(t: ImageTransform, w = W, h = H): string {
  const cx = w / 2;
  const cy = h / 2;
  return [
    `translate(${round(t.x * w)} ${round(t.y * h)})`,
    `translate(${cx} ${cy})`,
    `rotate(${round(t.rotation)})`,
    `scale(${round(t.scale)})`,
    `translate(${-cx} ${-cy})`,
  ].join(" ");
}

/** Applique le MÊME placement sur un canvas 2D (repère px), autour du centre du
 * rectangle carte `card`. À appeler entre ctx.save()/restore(), après avoir
 * clippé au rectangle carte et avant de dessiner l'image en cover dans ce
 * rectangle. Compose exactement comme svgArtTransform. */
export function applyArtTransformToCanvas(
  ctx: CanvasRenderingContext2D,
  t: ImageTransform,
  card: { x: number; y: number; w: number; h: number },
): void {
  const cx = card.x + card.w / 2;
  const cy = card.y + card.h / 2;
  ctx.translate(t.x * card.w, t.y * card.h); // pan (repère carte, non tourné)
  ctx.translate(cx, cy);
  ctx.rotate((t.rotation * Math.PI) / 180);
  ctx.scale(t.scale, t.scale);
  ctx.translate(-cx, -cy);
}
