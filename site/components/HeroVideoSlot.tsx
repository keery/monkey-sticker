"use client";

// Emplacement vidéo du hero : un téléphone au format vertical 9:16 qui « tape à
// l'œil ». Tant qu'aucune vidéo n'est fournie (`src` absent), il montre un
// teaser soigné — la carte en aperçu réel sous une lumière chaude, un bouton
// lecture qui pulse et une pastille « Bientôt ». Dès qu'on lui passe l'URL d'un
// MP4, le même cadre devient un vrai lecteur (poster optionnel).

import { useState, type CSSProperties } from "react";
import type { Product } from "@/lib/products";
import { useI18n } from "@/lib/i18n/context";
import { CardVisual } from "./CardVisual";

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5 translate-x-[1px]">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function HeroVideoSlot({
  card,
  src,
  poster,
}: {
  /** design affiché en aperçu sur l'écran du téléphone (teaser) */
  card: Product;
  /** URL de la vidéo — absente pour l'instant (le teaser s'affiche) */
  src?: string;
  /** image d'affiche du lecteur (optionnelle) */
  poster?: string;
}) {
  const { dict } = useI18n();
  const v = dict.home.hero.video;
  const [playing, setPlaying] = useState(false);
  const [c1, c2] = card.theme.colors;

  return (
    <div className="relative">
      <div
        className="hero-phone-glow"
        style={{ "--g1": `${c1}cc`, "--g2": `${c2}aa` } as CSSProperties}
        aria-hidden
      />
      <div className="hero-phone">
        {/* haut-parleur */}
        <span
          className="absolute left-1/2 top-[1.6%] z-10 h-1 w-8 -translate-x-1/2 rounded-full bg-black/50"
          aria-hidden
        />
        <div className="hero-phone-screen">
          {src && playing ? (
            <video
              src={src}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              {/* Lumière chaude aux couleurs du design. */}
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(120% 75% at 50% 6%, ${c1}2e, transparent 60%), linear-gradient(160deg, ${c2}20, transparent 55%)`,
                }}
                aria-hidden
              />
              {/* La carte, en aperçu réel — comme une story produit. */}
              <div className="hero-phone-card">
                <div
                  className="glow-tile glow-on"
                  style={{ "--g1": `${c1}99`, "--g2": `${c2}99` } as CSSProperties}
                >
                  <CardVisual
                    image={card.image}
                    theme={card.theme}
                    seed={card.handle}
                    transform={card.imageTransform}
                    background={card.imageBackground}
                    className="w-full"
                  />
                </div>
              </div>
              {/* Voile bas pour poser le texte. */}
              <div
                className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent"
                aria-hidden
              />
              {/* Durée. */}
              <span className="absolute right-2 top-2 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                {v.duration}
              </span>
              {/* Lecture : bouton réel si une vidéo existe, sinon glyphe décoratif. */}
              {src ? (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  aria-label={v.play}
                  className="hero-play absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <PlayGlyph />
                </button>
              ) : (
                <span
                  className="hero-play absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  aria-hidden
                >
                  <PlayGlyph />
                </span>
              )}
              {/* Titre + statut. */}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 p-2.5">
                <span className="text-[11px] font-semibold leading-tight text-white/95">{v.title}</span>
                {!src && (
                  <span className="shrink-0 rounded-full bg-flame px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-night">
                    {v.teaser}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
