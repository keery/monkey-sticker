// Vitrine défilante : les designs glissent lentement, chacun sous son halo,
// comme des enseignes lumineuses dans une rue la nuit.
//
// On peut l'attraper à la souris ou au doigt et la faire glisser gauche/droite
// en restant appuyé ; au relâchement, l'élan se poursuit puis le défilement
// automatique reprend en douceur. Défilement piloté en JS (translate3d + rAF)
// plutôt qu'en CSS pour permettre cette prise en main. La copie dupliquée
// (nécessaire à la boucle) est inerte pour l'accessibilité.

"use client";

import { useEffect, useRef, type CSSProperties, type Ref } from "react";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n/context";
import { localizedProduct } from "@/lib/i18n/catalog";
import { CardVisual } from "./CardVisual";
import { LocaleLink } from "./LocaleLink";

// Durée d'un cycle (une largeur de rangée) — reprend la vitesse d'origine (55s).
const CYCLE_MS = 55_000;

function Row({
  products,
  hidden = false,
  innerRef,
}: {
  products: Product[];
  hidden?: boolean;
  innerRef?: Ref<HTMLDivElement>;
}) {
  const { locale } = useI18n();
  return (
    <div ref={innerRef} className="inline-flex items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {products.map((p) => {
        const [c1, c2] = p.theme.colors;
        const { name } = localizedProduct(p, locale);
        return (
          <LocaleLink
            key={p.handle}
            href={`/products/${p.handle}`}
            draggable={false}
            tabIndex={hidden ? -1 : undefined}
            aria-label={name}
            className="group glow-tile glow-on block w-44 sm:w-56 shrink-0 transition-transform duration-500 ease-out hover:scale-[1.06]"
            style={{ "--g1": `${c1}b3`, "--g2": `${c2}b3` } as CSSProperties}
          >
            <CardVisual image={p.image} theme={p.theme} seed={p.handle} transform={p.imageTransform} background={p.imageBackground} className="w-full" />
            {/* Nom + prix, révélés au survol (desktop). En surimpression au bas de
                la carte pour ne pas décaler la rangée ; le halo et la pause du
                défilement au survol existent déjà. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-2 bottom-2 flex items-baseline justify-between gap-2 rounded-lg bg-night/75 px-3 py-2 text-ivory ring-1 ring-white/10 backdrop-blur-md opacity-0 transition duration-300 ease-out group-hover:opacity-100 motion-safe:translate-y-1 motion-safe:group-hover:translate-y-0"
            >
              <span className="truncate text-xs font-semibold sm:text-sm">{name}</span>
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold sm:text-sm">
                {formatPrice(p.price, locale)}
              </span>
            </div>
          </LocaleLink>
        );
      })}
    </div>
  );
}

export function VitrineMarquee({ products }: { products: Product[] }) {
  const viewportRef = useRef<HTMLDivElement>(null); // fenêtre visible (capte les gestes + curseur)
  const trackRef = useRef<HTMLDivElement>(null); // rail translaté
  const rowRef = useRef<HTMLDivElement>(null); // une copie, pour mesurer la largeur

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const row = rowRef.current;
    if (!viewport || !track || !row) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rowWidth = row.offsetWidth; // largeur d'une copie (padding inclus)
    let offset = 0; // translateX courant (px), maintenu dans (-rowWidth, 0]
    let velocity = 0; // px/ms (négatif = vers la gauche)
    let dragging = false;
    let hovering = false;
    let moved = false; // le pointeur a-t-il bougé assez pour être un glissement ?
    let startX = 0;
    let startOffset = 0;
    let lastX = 0;
    let lastT = 0;

    // Recalcule la largeur quand la mise en page change (chargement des images,
    // redimensionnement de la fenêtre, breakpoint w-44 → w-56…).
    const ro = new ResizeObserver(() => {
      const w = row.offsetWidth;
      if (w > 0) rowWidth = w;
    });
    ro.observe(row);

    const wrap = () => {
      if (rowWidth <= 0) return;
      // Les deux copies étant identiques, décaler d'une largeur est invisible.
      offset = ((offset % rowWidth) + rowWidth) % rowWidth - rowWidth;
    };

    const apply = () => {
      track.style.transform = `translate3d(${offset}px,0,0)`;
    };

    // Boucle d'animation : défilement auto + retour élastique de la vélocité
    // vers la vitesse de base (donne l'élan au relâchement puis la reprise).
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(now - last, 64); // borne les sauts (onglet en arrière-plan)
      last = now;
      if (!dragging) {
        const baseVel = reduce ? 0 : -rowWidth / CYCLE_MS;
        const target = hovering ? 0 : baseVel; // pause au survol (souris)
        const k = 1 - Math.exp(-dt / 480); // lissage exponentiel (~0.5s)
        velocity += (target - velocity) * k;
        offset += velocity * dt;
        wrap();
        apply();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return; // clic gauche seul
      dragging = true;
      moved = false;
      startX = e.clientX;
      startOffset = offset;
      lastX = e.clientX;
      lastT = performance.now();
      velocity = 0;
      viewport.style.cursor = "grabbing";
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      offset = startOffset + dx;
      wrap();
      apply();
      // Vélocité instantanée pour l'élan au relâchement.
      const now = performance.now();
      const gap = now - lastT;
      if (gap > 0) {
        velocity = (e.clientX - lastX) / gap;
        lastX = e.clientX;
        lastT = now;
      }
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      viewport.style.cursor = "grab";
      // `velocity` porte l'élan ; la boucle le ramène vers la vitesse de base.
    };

    // Après un glissement, on annule le clic pour ne pas ouvrir la fiche produit.
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
    };
    const noDrag = (e: Event) => e.preventDefault(); // pas d'image fantôme

    viewport.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    viewport.addEventListener("click", onClickCapture, true);
    viewport.addEventListener("pointerenter", onEnter);
    viewport.addEventListener("pointerleave", onLeave);
    viewport.addEventListener("dragstart", noDrag);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      viewport.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      viewport.removeEventListener("click", onClickCapture, true);
      viewport.removeEventListener("pointerenter", onEnter);
      viewport.removeEventListener("pointerleave", onLeave);
      viewport.removeEventListener("dragstart", noDrag);
    };
  }, []);

  return (
    <div
      ref={viewportRef}
      className="overflow-hidden fade-x-mask py-8 cursor-grab select-none touch-pan-y"
    >
      <div ref={trackRef} className="inline-flex whitespace-nowrap will-change-transform">
        <Row products={products} innerRef={rowRef} />
        <Row products={products} hidden />
      </div>
    </div>
  );
}
