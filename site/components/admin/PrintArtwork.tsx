"use client";

// Artwork d'impression avec VRAI fond perdu par étirement des bords (edge-clamp),
// qui suit la forme ARRONDIE de la carte (kiss-cut ISO ID-1).
//
// On dessine sur un <canvas> :
//   1. la carte nette, en cover (identique à l'aperçu `object-cover` du site),
//      clippée à sa vraie forme (rectangle à coins arrondis) ;
//   2. le fond perdu : on prend les pixels du CONTOUR de la carte et on les
//      étire perpendiculairement vers l'extérieur — tout droit sur les bords
//      droits, et en ÉVENTAIL RADIAL le long des 4 arcs de coin. C'est un vrai
//      edge-clamp d'imprimeur, pas une copie de l'image posée derrière.
//
// Sources same-origin (/designs/*) ou data-URL → canvas non « tainted »
// (getImageData autorisé), rendu fidèle dans le PDF (Chromium) comme à
// l'impression navigateur.

import { useEffect, useRef } from "react";
import type { ImageTransform } from "@/lib/products";
import { applyArtTransformToCanvas, IDENTITY_TRANSFORM } from "@/lib/card-art";

// Résolution du canvas : 12 px/mm ≈ 305 dpi (largement suffisant pour la découpe).
const PX_PER_MM = 12;

type Card = { x: number; y: number; w: number; h: number };

export function PrintArtwork({
  src,
  alt,
  art,
  card,
  cornerMm,
  transform = IDENTITY_TRANSFORM,
  background,
}: {
  src: string;
  alt: string;
  art: { w: number; h: number }; // zone de fond perdu (mm)
  card: Card; // rectangle de découpe, en mm, dans le repère de la zone
  cornerMm: number; // rayon des coins arrondis de la carte (mm)
  transform?: ImageTransform; // cadrage admin (échelle / position / rotation)
  background?: string; // couleur de fond de la carte derrière l'image (#RRGGBB)
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { scale, x, y, rotation } = transform;

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const draw = () => paint(canvas, img, card, cornerMm, { scale, x, y, rotation }, background);
    if (img.complete && img.naturalWidth > 0) draw();
    else {
      img.addEventListener("load", draw, { once: true });
      return () => img.removeEventListener("load", draw);
    }
  }, [src, art.w, art.h, card.x, card.y, card.w, card.h, cornerMm, scale, x, y, rotation, background]);

  return (
    <>
      <canvas
        ref={canvasRef}
        data-bleed=""
        width={Math.round(art.w * PX_PER_MM)}
        height={Math.round(art.h * PX_PER_MM)}
        role="img"
        aria-label={alt}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {/* Source de dessin : <img> réel (masqué) → son chargement compte dans le
          « networkidle » du rendu PDF, garantissant le dessin avant capture. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt="" style={{ display: "none" }} />
    </>
  );
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function paint(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  card: Card,
  cornerMm: number,
  transform: ImageTransform,
  background: string | undefined,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const S = PX_PER_MM;
  const aW = canvas.width;
  const aH = canvas.height;
  const cx = Math.round(card.x * S);
  const cy = Math.round(card.y * S);
  const cw = Math.round(card.w * S);
  const ch = Math.round(card.h * S);
  const cr = cx + cw;
  const cb = cy + ch;
  const r = Math.max(0, Math.min(Math.round(cornerMm * S), cw / 2, ch / 2));

  ctx.clearRect(0, 0, aW, aH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1) Carte nette : cover (comme `object-cover` du site), clippée à la forme
  //    arrondie réelle de la carte. On dessine l'image ENTIÈRE dans une boîte
  //    dimensionnée pour couvrir la carte (pas de crop source sx/sy/sw/sh : pour
  //    un SVG sans width/height, l'espace source vu par drawImage — le viewBox —
  //    diffère du naturalWidth/Height rapporté ; seul le RATIO natif est fiable).
  const nW = img.naturalWidth || cw;
  const nH = img.naturalHeight || ch;
  const imgAspect = nW / nH;
  const cardAspect = cw / ch;
  let dW: number;
  let dH: number;
  if (imgAspect > cardAspect) {
    dH = ch;
    dW = ch * imgAspect;
  } else {
    dW = cw;
    dH = cw / imgAspect;
  }
  const dX = cx + (cw - dW) / 2;
  const dY = cy + (ch - dH) / 2;
  ctx.save();
  roundRectPath(ctx, cx, cy, cw, ch, r);
  ctx.clip();
  // Fond de carte (derrière l'image) : rempli AVANT le transform, sur toute la
  // carte, pour couvrir les zones que l'image ne remplit pas (zoom / rotation /
  // cadrage décentré). Le fond perdu edge-clamp reprendra ensuite cette couleur.
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(cx, cy, cw, ch);
  }
  // Cadrage admin : même formule que l'aperçu SVG (échelle / position / rotation
  // autour du centre carte), appliqué APRÈS le clip → clippé à la forme carte.
  applyArtTransformToCanvas(ctx, transform, { x: cx, y: cy, w: cw, h: ch });
  ctx.drawImage(img, dX, dY, dW, dH);
  ctx.restore();

  // 2a) Bords DROITS : clamp perpendiculaire, uniquement sur la portion droite
  //     du contour (entre les arcs de coin).
  const sy = cy + r;
  const sh = ch - 2 * r; // hauteur du segment droit (gauche/droite)
  const sx = cx + r;
  const sw = cw - 2 * r; // largeur du segment droit (haut/bas)
  if (sh > 0) {
    if (cx > 0) ctx.drawImage(canvas, cx, sy, 1, sh, 0, sy, cx, sh); // gauche
    if (aW - cr > 0) ctx.drawImage(canvas, cr - 1, sy, 1, sh, cr, sy, aW - cr, sh); // droite
  }
  if (sw > 0) {
    if (cy > 0) ctx.drawImage(canvas, sx, cy, sw, 1, sx, 0, sw, cy); // haut
    if (aH - cb > 0) ctx.drawImage(canvas, sx, cb - 1, sw, 1, sx, cb, sw, aH - cb); // bas
  }

  // 2b) COINS ARRONDIS : clamp radial. Pour chaque arc, on échantillonne la
  //     couleur du contour à un angle donné et on l'étire radialement vers
  //     l'extérieur (éventail de secteurs), en clippant à la zone du coin.
  const HALF_PI = Math.PI / 2;
  const corners = [
    { cxc: cx + r, cyc: cy + r, a0: Math.PI, clip: [0, 0, cx + r, cy + r] }, // haut-gauche
    { cxc: cr - r, cyc: cy + r, a0: -HALF_PI, clip: [cr - r, 0, aW - (cr - r), cy + r] }, // haut-droite
    { cxc: cr - r, cyc: cb - r, a0: 0, clip: [cr - r, cb - r, aW - (cr - r), aH - (cb - r)] }, // bas-droite
    { cxc: cx + r, cyc: cb - r, a0: HALF_PI, clip: [0, cb - r, cx + r, aH - (cb - r)] }, // bas-gauche
  ];
  let data: Uint8ClampedArray | null = null;
  try {
    data = ctx.getImageData(0, 0, aW, aH).data;
  } catch {
    data = null; // canvas « tainted » (source cross-origin) → repli plus bas
  }

  if (r > 0 && data) {
    const far = Math.hypot(aW, aH); // rayon large : le clip du coin borne l'éventail
    const STEPS = 64; // secteurs par arc (lissage de l'éventail radial)
    for (const { cxc, cyc, a0, clip } of corners) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(clip[0], clip[1], clip[2], clip[3]);
      ctx.clip();
      for (let i = 0; i < STEPS; i++) {
        const t0 = a0 + (HALF_PI * i) / STEPS;
        const t1 = a0 + (HALF_PI * (i + 1)) / STEPS;
        const tm = (t0 + t1) / 2;
        const px = Math.round(cxc + (r - 1.5) * Math.cos(tm));
        const py = Math.round(cyc + (r - 1.5) * Math.sin(tm));
        const idx = (py * aW + px) * 4;
        const a = data[idx + 3];
        if (a === 0) continue;
        ctx.fillStyle = `rgba(${data[idx]},${data[idx + 1]},${data[idx + 2]},${a / 255})`;
        ctx.beginPath();
        ctx.moveTo(cxc + r * Math.cos(t0), cyc + r * Math.sin(t0));
        ctx.lineTo(cxc + far * Math.cos(t0), cyc + far * Math.sin(t0));
        ctx.lineTo(cxc + far * Math.cos(t1), cyc + far * Math.sin(t1));
        ctx.lineTo(cxc + r * Math.cos(t1), cyc + r * Math.sin(t1));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  } else {
    // Repli (rayon nul, ou canvas non lisible) : coins carrés étirés (1 px).
    if (cx > 0 && cy > 0) ctx.drawImage(canvas, cx, cy, 1, 1, 0, 0, cx, cy);
    if (aW - cr > 0 && cy > 0) ctx.drawImage(canvas, cr - 1, cy, 1, 1, cr, 0, aW - cr, cy);
    if (cx > 0 && aH - cb > 0) ctx.drawImage(canvas, cx, cb - 1, 1, 1, 0, cb, cx, aH - cb);
    if (aW - cr > 0 && aH - cb > 0)
      ctx.drawImage(canvas, cr - 1, cb - 1, 1, 1, cr, cb, aW - cr, aH - cb);
  }

  canvas.dataset.ready = "1";
}
