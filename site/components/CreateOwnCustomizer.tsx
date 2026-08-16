"use client";

// Customizer « Crée le tien » : l'atelier de la vitrine de nuit.
// Upload (clic, drag & drop, collage), cadrage (drag, pincement, molette,
// clavier) sur une carte au ratio exact ISO ID-1, fenêtre puce aux cotes
// réelles cardcut. Le halo derrière la carte reprend les couleurs dominantes
// du design uploadé ; une alerte de netteté (dpi) apparaît seulement si la
// résolution effective devient trop basse (zoom ou image trop petite).
// L'aperçu validé est rendu en canvas et stocké dans le panier.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CARD, CHIP_PLATES, CHIP_SIZES, CHIP_WINDOWS, type ChipSize } from "@/lib/site";
import { CUSTOM_PRODUCT } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n/context";
import { interpolate, plural } from "@/lib/i18n/interpolate";
import { ChipSizePicker } from "./ChipSizePicker";

// Fenêtre puce en % du format carte (cotes réelles presets.toml), selon la
// taille de puce choisie ; null = carte sans puce, pas de fenêtre.
function chipPct(chip: ChipSize) {
  if (chip === "none") return null;
  const w = CHIP_WINDOWS[chip];
  return {
    left: (w.xMm / CARD.widthMm) * 100,
    top: (w.yMm / CARD.heightMm) * 100,
    width: (w.wMm / CARD.widthMm) * 100,
    height: (w.hMm / CARD.heightMm) * 100,
  };
}
const CORNER_PCT = (CARD.cornerRadiusMm / CARD.widthMm) * 100;

// Insets de la plaque dorée (cotes réelles du module) dans sa fenêtre, en %.
function plateInsetPct(chip: Exclude<ChipSize, "none">) {
  const win = CHIP_WINDOWS[chip];
  const plate = CHIP_PLATES[chip];
  return {
    x: (((win.wMm - plate.wMm) / 2 / win.wMm) * 100).toFixed(1),
    y: (((win.hMm - plate.hMm) / 2 / win.hMm) * 100).toFixed(1),
  };
}

// 300 dpi sur 85,6 mm → résolution recommandée
const MIN_PX_W = Math.round((CARD.widthMm / 25.4) * 300);

const MAX_ZOOM = 4;
const MAX_FILE_MB = 25;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

// La `key` est aussi la valeur stockée au panier (optionValue en français) :
// on la conserve telle quelle, le libellé et l'indice affichés viennent du
// dictionnaire (dict.createOwn.finishes[key]).
const FINISHES = ["Mat", "Brillant"] as const;
type FinishKey = (typeof FINISHES)[number];

// Seuil de netteté d'impression : en dessous, on alerte ; au-dessus, silence.
const MIN_DPI = 120;

// Couleurs dominantes du design → halo de vitrine (--g1 / --g2).
// Moyenne pondérée par la saturation pour la teinte vive, moyenne simple
// pour la teinte de fond ; repli chaud doré si l'image est monochrome.
function extractGlow(image: HTMLImageElement): [string, string] {
  const fallback: [string, string] = ["rgba(212,175,55,0.55)", "rgba(201,90,38,0.4)"];
  try {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 20;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.drawImage(image, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sr = 0, sg = 0, sb = 0, sw = 0;
    let ar = 0, ag = 0, ab = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const w = sat * sat;
      sr += r * w; sg += g * w; sb += b * w; sw += w;
      ar += r; ag += g; ab += b; n++;
    }
    if (!n) return fallback;
    const avg = [ar / n, ag / n, ab / n];
    const vivid = sw > 3000 ? [sr / sw, sg / sw, sb / sw] : avg;
    const rgba = (v: number[], a: number) =>
      `rgba(${v.map((x) => Math.round(x)).join(",")},${a})`;
    return [rgba(vivid, 0.75), rgba(avg, 0.5)];
  } catch {
    return fallback;
  }
}

export function CreateOwnCustomizer() {
  const { addItem } = useCart();
  const { dict, locale } = useI18n();
  const t = dict.createOwn;
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [glow, setGlow] = useState<[string, string] | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [chip, setChip] = useState<ChipSize>("large");
  const [finish, setFinish] = useState<FinishKey>("Mat");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const needsCenter = useRef(false);

  // Miroir des valeurs courantes pour les listeners natifs (molette) et les
  // gestes : évite de ré-attacher des handlers à chaque frame de drag.
  const viewRef = useRef({ zoom: 1, offset: { x: 0, y: 0 } });
  useEffect(() => {
    viewRef.current = { zoom, offset };
  }, [zoom, offset]);

  // Gestes pointeur : drag à un doigt, pincement à deux.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{
    dist: number;
    mid: { x: number; y: number };
    zoom: number;
    offset: { x: number; y: number };
  } | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Échelle de base : l'image couvre toute la carte (mode cover)
  const baseScale = useCallback(
    () => (img && box.w ? Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) : 1),
    [img, box],
  );

  // Empêche de sortir du cadre : borne l'offset
  const clampOffset = useCallback(
    (x: number, y: number, z: number) => {
      if (!img || !box.w) return { x, y };
      const s = baseScale() * z;
      return {
        x: Math.min(0, Math.max(box.w - img.naturalWidth * s, x)),
        y: Math.min(0, Math.max(box.h - img.naturalHeight * s, y)),
      };
    },
    [img, box, baseScale],
  );

  const centered = useCallback(
    (z: number) => {
      if (!img || !box.w) return { x: 0, y: 0 };
      const s = baseScale() * z;
      return { x: (box.w - img.naturalWidth * s) / 2, y: (box.h - img.naturalHeight * s) / 2 };
    },
    [img, box, baseScale],
  );

  const clampZ = (z: number) => Math.min(MAX_ZOOM, Math.max(1, z));

  // Zoom autour d'un point fixe (curseur, centre du pincement ou de la carte) :
  // le point visé reste sous le doigt au lieu de dériver vers le coin.
  const zoomAround = useCallback(
    (
      targetZoom: number,
      fx: number,
      fy: number,
      from: { zoom: number; offset: { x: number; y: number } },
    ) => {
      const z = clampZ(targetZoom);
      const k = z / from.zoom;
      setZoom(z);
      setOffset(clampOffset(fx - (fx - from.offset.x) * k, fy - (fy - from.offset.y) * k, z));
    },
    [clampOffset],
  );

  // Taille réelle du cadre (responsive) via ResizeObserver
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Nouveau fichier ou cadre redimensionné : re-borne, et centre à l'arrivée
  useEffect(() => {
    if (!img || !box.w) return;
    if (needsCenter.current) {
      needsCenter.current = false;
      setZoom(1);
      setOffset(centered(1));
    } else {
      setOffset((o) => clampOffset(o.x, o.y, viewRef.current.zoom));
    }
  }, [img, box, centered, clampOffset]);

  const onFile = useCallback((file: File) => {
    setError(null);
    const okType =
      ACCEPTED_TYPES.includes(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!okType) {
      setError(t.errors.type);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(interpolate(t.errors.tooLarge, { max: MAX_FILE_MB }));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      needsCenter.current = true;
      setImg(image);
      setGlow(extractGlow(image));
      setAdded(false);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError(t.errors.unreadable);
    };
    image.src = url;
  }, [t]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  // Collage direct (Ctrl/Cmd V) depuis le presse-papier
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) onFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  // Molette : zoom autour du curseur (listener natif non-passif,
  // React attache wheel en passif et bloquerait preventDefault)
  useEffect(() => {
    const el = previewRef.current;
    if (!el || !img) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const from = viewRef.current;
      zoomAround(
        from.zoom * Math.exp(-e.deltaY * 0.0018),
        e.clientX - rect.left,
        e.clientY - rect.top,
        from,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [img, zoomAround]);

  function localPoint(e: React.PointerEvent) {
    const rect = previewRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!img) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = localPoint(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        zoom: viewRef.current.zoom,
        offset: viewRef.current.offset,
      };
      drag.current = null;
    } else {
      drag.current = { x: p.x, y: p.y, ox: offset.x, oy: offset.y };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    const p = localPoint(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 2 && pinch.current) {
      // Pincement : zoom + déplacement en un geste, calculé depuis l'état
      // de départ du geste (stable, pas de dérive frame à frame)
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const start = pinch.current;
      const z = clampZ(start.zoom * (dist / Math.max(1, start.dist)));
      const k = z / start.zoom;
      setZoom(z);
      setOffset(
        clampOffset(
          mid.x - (start.mid.x - start.offset.x) * k,
          mid.y - (start.mid.y - start.offset.y) * k,
          z,
        ),
      );
    } else if (drag.current) {
      setOffset(
        clampOffset(
          drag.current.ox + (p.x - drag.current.x),
          drag.current.oy + (p.y - drag.current.y),
          viewRef.current.zoom,
        ),
      );
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      drag.current = { x: p.x, y: p.y, ox: viewRef.current.offset.x, oy: viewRef.current.offset.y };
    } else {
      drag.current = null;
    }
  }

  // Cadrage au clavier : flèches pour déplacer, + / − pour zoomer, 0 reset
  function onKeyDown(e: React.KeyboardEvent) {
    if (!img) return;
    const step = e.shiftKey ? 1 : 12;
    const { zoom: z, offset: o } = viewRef.current;
    const move = (dx: number, dy: number) => setOffset(clampOffset(o.x + dx, o.y + dy, z));
    const cx = box.w / 2;
    const cy = box.h / 2;
    switch (e.key) {
      case "ArrowLeft": move(-step, 0); break;
      case "ArrowRight": move(step, 0); break;
      case "ArrowUp": move(0, -step); break;
      case "ArrowDown": move(0, step); break;
      case "+":
      case "=": zoomAround(z * 1.12, cx, cy, viewRef.current); break;
      case "-": zoomAround(z / 1.12, cx, cy, viewRef.current); break;
      case "0": setZoom(1); setOffset(centered(1)); break;
      default: return;
    }
    e.preventDefault();
  }

  function onSlider(v: number) {
    zoomAround(v, box.w / 2, box.h / 2, viewRef.current);
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  // Netteté d'impression effective : réagit au zoom (zoomer = recadrer =
  // moins de pixels sur la largeur de la carte)
  const dpi = useMemo(() => {
    if (!img || !box.w) return null;
    const s = baseScale() * zoom;
    return Math.round(box.w / s / (CARD.widthMm / 25.4));
  }, [img, box, zoom, baseScale]);

  // Rend l'aperçu final en canvas (856×540) pour la vignette panier
  function renderThumbnail(): string | undefined {
    if (!img || !box.w) return undefined;
    const W = 856;
    const H = 540;
    const k = W / box.w;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    // clip coins arrondis
    const r = (CARD.cornerRadiusMm / CARD.widthMm) * W;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, r);
    ctx.clip();

    const s = baseScale() * zoom * k;
    ctx.drawImage(img, offset.x * k, offset.y * k, img.naturalWidth * s, img.naturalHeight * s);

    // fenêtre puce : plaque dorée par-dessus (la vraie puce restera visible),
    // aux cotes réelles du module choisi ; rien si carte sans puce
    if (chip !== "none") {
      const pct = chipPct(chip)!;
      const cx = (pct.left / 100) * W;
      const cy = (pct.top / 100) * H;
      const cw = (pct.width / 100) * W;
      const ch = (pct.height / 100) * H;
      const win = CHIP_WINDOWS[chip];
      const pw = (CHIP_PLATES[chip].wMm / win.wMm) * cw;
      const ph = (CHIP_PLATES[chip].hMm / win.hMm) * ch;
      ctx.fillStyle = "#d3aa4c";
      ctx.beginPath();
      ctx.roundRect(cx + (cw - pw) / 2, cy + (ch - ph) / 2, pw, ph, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.stroke();
    }
    return canvas.toDataURL("image/jpeg", 0.8);
  }

  function addToCart() {
    if (!img) {
      openPicker();
      return;
    }
    const thumbnail = renderThumbnail();
    addItem(
      {
        handle: CUSTOM_PRODUCT.handle,
        name: `Sticker personnalisé (${finish.toLowerCase()})`,
        price: CUSTOM_PRODUCT.price,
        kind: "custom",
        options: {
          Finition: finish,
          Puce: CHIP_SIZES.find((c) => c.key === chip)!.optionValue,
        },
        customImage: thumbnail,
      },
      qty,
    );
    setAdded(true);
  }

  // BOGO sur cette ligne : 1 sur 2 offert (le panier applique la même règle
  // sur l'ensemble des stickers, designs mélangés compris)
  const lineTotal = CUSTOM_PRODUCT.price * qty;
  const freeUnits = Math.floor(qty / 2);
  const lineAfter = lineTotal - freeUnits * CUSTOM_PRODUCT.price;

  const chipWin = chipPct(chip);
  const focusRing =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-start pb-24 lg:pb-0">
      {/* ------------------------------------------------------------ */}
      {/* La vitrine : aperçu de la carte, halo aux couleurs du design  */}
      {/* ------------------------------------------------------------ */}
      <div className="lg:sticky lg:top-24">
        <div
          className="glow-tile glow-on"
          style={glow ? ({ "--g1": glow[0], "--g2": glow[1] } as CSSProperties) : undefined}
        >
          <div
            ref={previewRef}
            role={img ? "application" : undefined}
            tabIndex={img ? 0 : -1}
            aria-label={img ? t.preview.ariaLabel : undefined}
            className={`relative w-full overflow-hidden select-none touch-none bg-night-2 border shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-flame ${
              dragOver ? "border-flame" : "border-white/10"
            } ${img ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
            style={{
              aspectRatio: `${CARD.widthMm} / ${CARD.heightMm}`,
              borderRadius: `${CORNER_PCT}% / ${(CORNER_PCT * CARD.ratio).toFixed(2)}%`,
            }}
            onClick={() => !img && openPicker()}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) onFile(file);
            }}
          >
            {img ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={t.preview.imageAlt}
                  draggable={false}
                  className="absolute left-0 top-0 origin-top-left max-w-none will-change-transform"
                  style={{
                    width: img.naturalWidth,
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${baseScale() * zoom})`,
                  }}
                />
                {/* Reflet de vitrine : un passage de lumière à l'arrivée du design */}
                <div key={img.src} className="tilt-sheen-wrap" aria-hidden>
                  <div className="tilt-sheen" />
                </div>
              </>
            ) : (
              <div className="absolute inset-2 sm:inset-3 flex flex-col items-center justify-center gap-2.5 rounded-[inherit] border-2 border-dashed border-white/20 px-6 text-center">
                <p className="font-display uppercase text-ivory text-lg sm:text-2xl">
                  {t.dropzone.title}
                </p>
                <p className="hidden sm:block text-xs text-ivory-dim">
                  {t.dropzone.hint}
                </p>
                <button
                  type="button"
                  className={`rounded-full bg-ivory text-night px-6 py-3 text-sm font-bold uppercase tracking-wide hover:bg-white transition-colors ${focusRing}`}
                >
                  {t.upload.choose}
                </button>
                <p className="font-mono text-[10px] text-ivory-dim">
                  {interpolate(t.dropzone.formats, { min: MIN_PX_W })}
                </p>
              </div>
            )}

            {/* Fenêtre puce : position et cotes réelles de la taille choisie */}
            {chip !== "none" && chipWin && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${chipWin.left}%`,
                  top: `${chipWin.top}%`,
                  width: `${chipWin.width}%`,
                  height: `${chipWin.height}%`,
                }}
              >
                <div className="absolute inset-0 rounded-lg border-2 border-dashed border-white/90 mix-blend-difference" />
                <div
                  className="absolute rounded-md bg-gradient-to-br from-[#e8c86e] via-[#c9a13b] to-[#e5be5a] border border-black/30 shadow-sm"
                  style={{
                    left: `${plateInsetPct(chip).x}%`,
                    right: `${plateInsetPct(chip).x}%`,
                    top: `${plateInsetPct(chip).y}%`,
                    bottom: `${plateInsetPct(chip).y}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Ligne d'atelier : cotes exactes + alerte netteté si trop basse */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px] text-ivory-dim">
          <span>{t.preview.dimensions}</span>
          {dpi !== null && dpi < MIN_DPI && (
            <span className="text-red-400">{interpolate(t.preview.sharpnessBadge, { dpi })}</span>
          )}
        </div>
        <p className="mt-2 text-xs text-ivory-dim">
          {chipWin ? t.preview.chipHint : t.preview.noChipHint}
        </p>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* L'établi : trois étapes, tout visible, rien de caché          */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-9">
        {/* 01 · Ton image */}
        <section>
          <p className="flex items-baseline gap-3">
            <span className="font-display text-2xl text-flame">01</span>
            <span className="text-base font-semibold text-ivory">{t.steps.image}</span>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openPicker}
              className={`rounded-full border border-white/25 text-ivory px-6 py-3 text-sm font-bold uppercase tracking-wide hover:border-ivory hover:bg-white/5 transition-colors ${focusRing}`}
            >
              {img ? t.upload.replace : t.upload.choose}
            </button>
            <span className="text-xs text-ivory-dim">
              {t.upload.hint}
            </span>
          </div>
          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </section>

        {/* 02 · Le cadrage */}
        <section className={img ? "" : "opacity-40"}>
          <p className="flex items-baseline gap-3">
            <span className="font-display text-2xl text-flame">02</span>
            <span className="text-base font-semibold text-ivory">{t.steps.crop}</span>
          </p>
          <div className="mt-3">
            <label htmlFor="custom-zoom" className="sr-only">{t.crop.zoomLabel}</label>
            <input
              id="custom-zoom"
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!img}
              onChange={(e) => onSlider(Number(e.target.value))}
              className="w-full h-11 accent-flame"
            />
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-ivory-dim">
                <span className="sm:hidden">{t.crop.hintMobile}</span>
                <span className="hidden sm:inline">
                  {t.crop.hintDesktop}
                </span>
              </p>
              <button
                type="button"
                disabled={!img}
                onClick={() => {
                  setZoom(1);
                  setOffset(centered(1));
                }}
                className={`shrink-0 text-xs font-semibold text-ivory-dim underline underline-offset-4 hover:text-ivory disabled:no-underline ${focusRing}`}
              >
                {t.crop.recenter}
              </button>
            </div>
            {dpi !== null && dpi < MIN_DPI && (
              <p className="mt-2 text-xs text-amber-300">
                {t.crop.sharpnessWarning}
              </p>
            )}
          </div>
        </section>

        {/* 03 · La puce */}
        <section>
          <p className="flex items-baseline gap-3">
            <span className="font-display text-2xl text-flame">03</span>
            <span className="text-base font-semibold text-ivory">{t.steps.chip}</span>
          </p>
          <div className="mt-4">
            <ChipSizePicker value={chip} onChange={setChip} tone="dark" />
          </div>
        </section>

        {/* 04 · Finition et quantité */}
        <section>
          <p className="flex items-baseline gap-3">
            <span className="font-display text-2xl text-flame">04</span>
            <span className="text-base font-semibold text-ivory">{t.steps.finishQty}</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={t.finish.groupLabel}>
            {FINISHES.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={finish === f}
                onClick={() => setFinish(f)}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${focusRing} ${
                  finish === f
                    ? "border-flame bg-flame/10"
                    : "border-white/15 hover:border-white/40"
                }`}
              >
                <span className="block text-sm font-bold text-ivory">{t.finishes[f].label}</span>
                <span className="mt-0.5 block text-xs text-ivory-dim">{t.finishes[f].hint}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center rounded-full border border-white/20">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label={t.qty.decrease}
                className={`h-11 w-11 text-lg text-ivory ${focusRing}`}
              >
                −
              </button>
              <span className="min-w-8 text-center tabular-nums font-semibold text-ivory" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                aria-label={t.qty.increase}
                className={`h-11 w-11 text-lg text-ivory ${focusRing}`}
              >
                +
              </button>
            </div>
            {freeUnits === 0 ? (
              <button
                type="button"
                onClick={() => setQty(2)}
                className={`text-sm font-semibold text-flame underline underline-offset-4 hover:text-flame-deep ${focusRing}`}
              >
                {t.bogo.upsell}
              </button>
            ) : (
              <p className="text-sm text-ivory-dim">
                <span className="font-semibold text-flame">
                  {plural(locale, freeUnits, t.bogo.freeCount, { count: freeUnits })}
                </span>{" "}
                {t.bogo.freeTail}
              </p>
            )}
          </div>
        </section>

        {/* CTA */}
        <div>
          <button
            type="button"
            onClick={addToCart}
            className={`w-full rounded-full bg-flame text-night h-14 px-6 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors ${focusRing}`}
          >
            {img ? (
              <>
                {t.cta.addToCart} ·{" "}
                {freeUnits > 0 && (
                  <s className="font-semibold opacity-60">{formatPrice(lineTotal, locale)}</s>
                )}{" "}
                {formatPrice(lineAfter, locale)}
              </>
            ) : (
              t.cta.chooseFirst
            )}
          </button>
          {added && (
            <p role="status" className="mt-3 text-sm font-medium text-emerald-400">
              {t.cta.added}
            </p>
          )}

          <ul className="mt-5 space-y-2.5 text-sm">
            {t.guarantees.map((g) => (
              <li key={g.title} className="flex items-baseline gap-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-flame" />
                <span>
                  <span className="font-semibold text-ivory">{g.title}</span>
                  <span className="text-ivory-dim"> : {g.desc}.</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Barre d'achat mobile : le prix et l'action toujours à portée  */}
      {/* ------------------------------------------------------------ */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden border-t border-white/10 bg-night/90 backdrop-blur px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ivory tabular-nums">
              {freeUnits > 0 && (
                <s className="mr-1.5 font-medium text-ivory-dim">{formatPrice(lineTotal, locale)}</s>
              )}
              {formatPrice(lineAfter, locale)}
            </p>
            <p className="text-[11px] text-ivory-dim truncate">
              {plural(locale, qty, t.mobileBar.stickers, { count: qty })} ·{" "}
              {t.finishes[finish].label.toLowerCase()} · {dict.chip.sizes[chip].label.toLowerCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={addToCart}
            className={`flex-1 rounded-full bg-flame text-night h-12 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors ${focusRing}`}
          >
            {img ? t.cta.addToCart : t.upload.choose}
          </button>
        </div>
      </div>
    </div>
  );
}
