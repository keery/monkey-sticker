"use client";

// Éditeur de cadrage intégré : on positionne / redimensionne / tourne l'artwork
// directement sur la carte, sans autre logiciel. L'aperçu EST le rendu final
// (même formule de transform que la vitrine et l'impression) → WYSIWYG.
//   · glisser dans le cadre  → déplacer
//   · molette                → zoomer (autour du centre)
//   · curseurs / champs       → échelle & rotation fines (saisie au chiffre près)
// La puce est affichée pour éviter de placer un élément clé dessous.

import { useEffect, useRef, useState } from "react";
import type { ImageTransform, Theme } from "@/lib/products";
import { CardVisual } from "@/components/CardVisual";
import { IDENTITY_TRANSFORM } from "@/lib/card-art";

const round = (n: number) => Math.round(n * 1000) / 1000;
const clampScale = (s: number) => Math.min(10, Math.max(0.1, s));
const clampPan = (v: number) => Math.min(3, Math.max(-3, v));
const clampRot = (r: number) => Math.min(180, Math.max(-180, r));

export function ArtworkPositioner({
  image,
  theme,
  value,
  onChange,
  background,
}: {
  image: string;
  theme: Theme;
  value: ImageTransform;
  onChange: (t: ImageTransform) => void;
  background?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  // miroir de `value` pour le listener molette (attaché une seule fois).
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  // Saisie numérique libre : on garde un brouillon pendant la frappe et on
  // applique (avec bornes) à la validation — sinon la valeur « sauterait » à
  // chaque touche (ex. taper « 250 » passerait par 2 → 20 → clampé).
  const [scaleDraft, setScaleDraft] = useState<string | null>(null);
  const [rotDraft, setRotDraft] = useState<string | null>(null);

  const commitScale = (raw: string) => {
    const n = parseFloat(raw.replace(",", "."));
    if (Number.isFinite(n)) onChange({ ...value, scale: round(clampScale(n / 100)) });
    setScaleDraft(null);
  };
  const commitRot = (raw: string) => {
    const n = parseFloat(raw.replace(",", "."));
    if (Number.isFinite(n)) onChange({ ...value, rotation: round(clampRot(n)) });
    setRotDraft(null);
  };

  // Molette = zoom. Listener non passif (addEventListener) pour pouvoir
  // preventDefault et ne pas scroller la page pendant le réglage.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      const v = valueRef.current;
      onChange({ ...v, scale: round(clampScale(v.scale * factor)) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onChange]);

  function onPointerDown(e: React.PointerEvent) {
    const el = frameRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: value.x, y: value.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const el = frameRef.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    onChange({
      ...value,
      x: round(clampPan(d.x + (e.clientX - d.px) / rect.width)),
      y: round(clampPan(d.y + (e.clientY - d.py) / rect.height)),
    });
  }
  function endDrag(e: React.PointerEvent) {
    drag.current = null;
    frameRef.current?.releasePointerCapture?.(e.pointerId);
  }

  const rotateBy = (deg: number) => {
    let r = ((value.rotation + deg + 180) % 360) - 180;
    if (r <= -180) r += 360;
    onChange({ ...value, rotation: round(r) });
  };

  const sliderCls =
    "w-full accent-flame [&::-webkit-slider-thumb]:cursor-pointer";
  const chipBtn =
    "rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-ivory-dim transition-colors hover:border-white/30 hover:text-ivory";
  const numInput =
    "w-16 rounded-md border border-white/15 bg-transparent px-2 py-1 text-right font-mono text-xs text-ivory tabular-nums outline-none focus:border-flame/60";

  return (
    <div className="space-y-4">
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative w-full cursor-grab touch-none select-none rounded-2xl drop-shadow-2xl active:cursor-grabbing"
        style={{ aspectRatio: `${856} / ${540}` }}
      >
        <CardVisual image={image} theme={theme} seed="apercu-cadrage" transform={value} background={background} className="w-full" />
        {/* cadre repère : bord réel de la carte */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
      </div>

      <p className="text-center text-xs text-ivory-dim">
        Glisse pour déplacer · molette pour zoomer · règle l&apos;échelle et la rotation ci-dessous
      </p>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <label className="block text-sm">
          <span className="flex items-center justify-between gap-2 font-semibold text-ivory">
            Échelle
            <span className="flex items-center gap-1 text-xs font-normal text-ivory-dim">
              <input
                type="number"
                min={10}
                max={1000}
                step={1}
                value={scaleDraft ?? String(Math.round(value.scale * 100))}
                onChange={(e) => setScaleDraft(e.target.value)}
                onBlur={(e) => commitScale(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitScale((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                aria-label="Échelle en pourcentage"
                className={numInput}
              />
              %
            </span>
          </span>
          <input
            type="range"
            min={10}
            max={400}
            step={1}
            value={Math.min(400, Math.round(value.scale * 100))}
            onChange={(e) => onChange({ ...value, scale: round(clampScale(Number(e.target.value) / 100)) })}
            className={`mt-2 ${sliderCls}`}
          />
        </label>

        <label className="block text-sm">
          <span className="flex items-center justify-between gap-2 font-semibold text-ivory">
            Rotation
            <span className="flex items-center gap-1 text-xs font-normal text-ivory-dim">
              <input
                type="number"
                min={-180}
                max={180}
                step={1}
                value={rotDraft ?? String(Math.round(value.rotation))}
                onChange={(e) => setRotDraft(e.target.value)}
                onBlur={(e) => commitRot(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRot((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                aria-label="Rotation en degrés"
                className={numInput}
              />
              °
            </span>
          </span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={Math.round(value.rotation)}
            onChange={(e) => onChange({ ...value, rotation: round(Number(e.target.value)) })}
            className={`mt-2 ${sliderCls}`}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" onClick={() => rotateBy(-90)} className={chipBtn}>⟲ 90°</button>
          <button type="button" onClick={() => rotateBy(90)} className={chipBtn}>⟳ 90°</button>
          {/* recentre l'image (décalage nul) sans toucher à l'échelle ni à la rotation */}
          <button type="button" onClick={() => onChange({ ...value, x: 0, y: 0 })} className={chipBtn}>
            Centrer
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...IDENTITY_TRANSFORM })}
            className={`${chipBtn} ml-auto`}
          >
            Remplir la carte
          </button>
        </div>
      </div>
    </div>
  );
}
