"use client";

// Carte 3D du hero : suit le pointeur (rotateX/rotateY), reflet spéculaire
// qui glisse sous le curseur, balayage holographique au chargement et halo
// aux couleurs du design. Au repos (ou au doigt), la carte flotte lentement.
// Tout est coupé si prefers-reduced-motion est actif.

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { CARD } from "@/lib/site";

// Rayon des coins au ratio exact de la carte, pour que reflets et balayage
// restent parfaitement rognés sur l'objet.
const RADIUS = `${((CARD.cornerRadiusMm / CARD.widthMm) * 100).toFixed(2)}% / ${(
  (CARD.cornerRadiusMm / CARD.heightMm) * 100
).toFixed(2)}%`;

export function Tilt3DCard({
  children,
  glow,
  className,
}: {
  children: ReactNode;
  /** deux couleurs du design, utilisées pour le halo */
  glow?: [string, string];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = el.querySelector<HTMLElement>(".tilt-card");

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        // Suivi serré : la carte reste collée au pointeur.
        if (card) card.style.transitionDuration = "0.12s";
        el.style.setProperty("--ry", `${((px - 0.5) * 22).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - py) * 16).toFixed(2)}deg`);
        el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
        el.style.setProperty("--glare", "1");
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        // Retour au repos plus souple, sans à-coup.
        if (card) card.style.transitionDuration = "0.55s";
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--glare", "0");
      });
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf.current);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const glowStyle = glow
    ? ({ "--g1": `${glow[0]}cc`, "--g2": `${glow[1]}cc` } as CSSProperties)
    : undefined;

  return (
    <div ref={ref} className={`tilt-scene ${className ?? ""}`} style={glowStyle}>
      <div className="tilt-glow" aria-hidden />
      <div className="tilt-float">
        <div className="tilt-card">
          {children}
          <div className="tilt-glare" style={{ borderRadius: RADIUS }} aria-hidden />
          <div className="tilt-sheen-wrap" style={{ borderRadius: RADIUS }} aria-hidden>
            <span className="tilt-sheen" />
          </div>
        </div>
      </div>
    </div>
  );
}
