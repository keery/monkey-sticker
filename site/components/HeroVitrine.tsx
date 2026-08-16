"use client";

// Vitrine vivante du hero : la carte focale (bijou en tilt 3D) trône au milieu
// d'un mur de vraies cartes customisées, à des profondeurs et rotations variées,
// avec un emplacement vidéo vertical qui accroche l'œil. Au pointeur, chaque
// couche dérive selon sa profondeur (parallaxe) ; au chargement, tout se
// matérialise en cascade ; au repos, les cartes flottent. Rien ne bouge en
// mouvement réduit ou au doigt (pas de parallaxe sur écran tactile).

import { useEffect, useRef, type CSSProperties } from "react";
import type { Product } from "@/lib/products";
import { useI18n } from "@/lib/i18n/context";
import { localizedProduct } from "@/lib/i18n/catalog";
import { interpolate } from "@/lib/i18n/interpolate";
import { CardVisual } from "./CardVisual";
import { Tilt3DCard } from "./Tilt3DCard";
import { LocaleLink } from "./LocaleLink";
import { HeroVideoSlot } from "./HeroVideoSlot";

// Placement du mur (sm+) : position, rotation, profondeur (amplitude de
// parallaxe) et cadence de flottement propres à chaque carte, pour une compo
// asymétrique et vivante. Les cartes lointaines dérivent plus (depth élevé).
type WallPos = {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  width: string;
  rot: number;
  z: number;
  op: number;
  depth: number;
  enter: number;
  bobDur: number;
  bobDelay: number;
};

const WALL_POS: WallPos[] = [
  { left: "-1%", top: "-3%", width: "35%", rot: -13, z: 10, op: 0.72, depth: 0.7, enter: 360, bobDur: 8.5, bobDelay: 200 },
  { right: "8%", top: "-6%", width: "31%", rot: 9, z: 15, op: 0.82, depth: 0.5, enter: 300, bobDur: 7.5, bobDelay: 700 },
  { left: "8%", bottom: "-5%", width: "40%", rot: 6, z: 20, op: 0.88, depth: 0.42, enter: 340, bobDur: 9, bobDelay: 1100 },
  { right: "2%", bottom: "-3%", width: "27%", rot: -8, z: 12, op: 0.7, depth: 0.6, enter: 440, bobDur: 8, bobDelay: 450 },
];

function glowVars(c1: string, c2: string): CSSProperties {
  return { "--g1": `${c1}99`, "--g2": `${c2}99` } as CSSProperties;
}

export function HeroVitrine({
  focal,
  wall,
  videoCard,
  videoSrc,
  videoPoster,
}: {
  focal: Product;
  wall: Product[];
  videoCard: Product;
  /** URL du MP4 quand la vidéo sera tournée (le slot affiche un teaser sinon) */
  videoSrc?: string;
  videoPoster?: string;
}) {
  const { dict, locale } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const cardAlt = (name: string) => interpolate(dict.home.hero.cardAlt, { name });

  // Parallaxe de profondeur au pointeur (souris fine uniquement).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduce || !fine) return;

    const layers = Array.from(stage.querySelectorAll<HTMLElement>(".hero-layer[data-depth]"));
    const MAX = 15; // px de dérive max (la carte focale bouge peu, le fond plus)
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        for (const l of layers) {
          const d = Number(l.dataset.depth) || 0;
          l.style.setProperty("--px", `${(-nx * MAX * d).toFixed(2)}px`);
          l.style.setProperty("--py", `${(-ny * MAX * d).toFixed(2)}px`);
        }
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        for (const l of layers) {
          l.style.setProperty("--px", "0px");
          l.style.setProperty("--py", "0px");
        }
      });
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const focalName = localizedProduct(focal, locale).name;
  const [fc1, fc2] = focal.theme.colors;

  return (
    <div ref={stageRef} className="relative h-[22rem] sm:h-[28rem] lg:h-[32rem]">
      {/* Mur de vraies cartes (profondeur) — masqué en mobile pour rester net. */}
      {wall.slice(0, WALL_POS.length).map((p, i) => {
        const pos = WALL_POS[i];
        const { name } = localizedProduct(p, locale);
        const [c1, c2] = p.theme.colors;
        return (
          <div
            key={p.handle}
            className="absolute hidden sm:block"
            style={{ left: pos.left, right: pos.right, top: pos.top, bottom: pos.bottom, width: pos.width, zIndex: pos.z }}
          >
            <div className="hero-layer" data-depth={pos.depth}>
              <div className="hero-enter" style={{ animationDelay: `${pos.enter}ms` }}>
                <div
                  className="hero-bob"
                  style={{ "--bob-dur": `${pos.bobDur}s`, "--bob-delay": `${pos.bobDelay}ms` } as CSSProperties}
                >
                  <div style={{ transform: `rotate(${pos.rot}deg)`, opacity: pos.op }}>
                    <LocaleLink
                      href={`/products/${p.handle}`}
                      aria-label={cardAlt(name)}
                      className="group glow-tile glow-on block"
                      style={glowVars(c1, c2)}
                    >
                      <CardVisual
                        image={p.image}
                        theme={p.theme}
                        seed={p.handle}
                        transform={p.imageTransform}
                        background={p.imageBackground}
                        className="w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    </LocaleLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* La pièce maîtresse : la carte focale en tilt 3D, reflets et halo. */}
      <div className="absolute inset-y-0 left-[2%] flex w-[62%] items-center sm:left-[3%] sm:w-[54%]" style={{ zIndex: 30 }}>
        <div className="hero-layer w-full" data-depth={0.12}>
          <div className="hero-enter" style={{ animationDelay: "120ms" }}>
            <LocaleLink href={`/products/${focal.handle}`} aria-label={cardAlt(focalName)} className="block">
              <Tilt3DCard glow={[fc1, fc2]} className="-rotate-3">
                <CardVisual
                  image={focal.image}
                  theme={focal.theme}
                  seed={focal.handle}
                  transform={focal.imageTransform}
                  background={focal.imageBackground}
                  className="w-full drop-shadow-2xl"
                />
              </Tilt3DCard>
            </LocaleLink>
          </div>
        </div>
      </div>

      {/* L'emplacement vidéo — un téléphone 9:16 qui tape à l'œil. */}
      <div
        className="absolute inset-y-0 right-[1%] flex w-[36%] items-end sm:w-[26%] sm:items-center"
        style={{ zIndex: 40 }}
      >
        <div className="hero-layer w-full" data-depth={0.26}>
          <div className="hero-enter" style={{ animationDelay: "300ms" }}>
            <div className="hero-bob" style={{ "--bob-dur": "8s", "--bob-delay": "900ms" } as CSSProperties}>
              <div style={{ transform: "rotate(2.5deg)" }}>
                <HeroVideoSlot card={videoCard} src={videoSrc} poster={videoPoster} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
