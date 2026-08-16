"use client";

// Tuile produit interactive des listes (grilles boutique) : la carte flotte sous
// son halo, puis le nom / prix, puis — pour un produit à variantes de couleur —
// une rangée de pastilles SOUS la carte (en bas à gauche, sous le nom).
// · desktop : survoler une pastille bascule l'aperçu de la carte sur l'image de
//   cette couleur ; la dernière survolée reste affichée (elle devient active) ;
// · mobile : taper une pastille bascule l'aperçu.
// L'aperçu démarre sur la variante par défaut (#0), déjà pré-sélectionnée.
// Le cadrage est partagé par toutes les couleurs : seuls l'image et le fond
// changent. Nom / prix localisés côté serveur, passés en texte (props).

import { useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ImageTransform, ProductVariant, Theme } from "@/lib/products";
import { useI18n } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/interpolate";
import { LocaleLink } from "./LocaleLink";
import { CardVisual } from "./CardVisual";

export function TileVisual({
  href,
  name,
  priceLabel,
  badge,
  image,
  theme,
  seed,
  transform,
  background,
  variants,
}: {
  /** cible du lien (sans préfixe de locale) */
  href: string;
  /** nom localisé du produit */
  name: string;
  /** prix déjà formaté pour la locale */
  priceLabel: string;
  badge?: string;
  image?: string;
  theme: Theme;
  seed: string;
  transform?: ImageTransform;
  background?: string;
  variants?: ProductVariant[];
}) {
  const { dict } = useI18n();
  const reduce = useReducedMotion();
  const hasVariants = (variants?.length ?? 0) >= 2;
  // 0 = variante par défaut (couleur principale), déjà pré-sélectionnée.
  const [active, setActive] = useState(0);

  const current = hasVariants ? variants![active] : null;
  const shownImage = current?.image ?? image;
  const shownBackground = current ? current.imageBackground ?? background : background;
  const [c1, c2] = theme.colors;

  return (
    <div className="group">
      <div
        className="glow-tile"
        style={{ "--g1": `${c1}b3`, "--g2": `${c2}b3` } as CSSProperties}
      >
        {badge && (
          <span className="pointer-events-none absolute top-2 left-2 z-10 bg-ivory text-night text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1">
            {badge}
          </span>
        )}
        <LocaleLink href={href} aria-label={name} className="block">
          <CardVisual
            image={shownImage}
            theme={theme}
            seed={seed}
            transform={transform}
            background={shownBackground}
            className="w-full transition-transform duration-500 ease-out group-hover:scale-[1.045] group-hover:-rotate-1"
          />
        </LocaleLink>
      </div>

      <LocaleLink href={href} className="mt-3.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ivory">{name}</p>
        <p className="text-sm font-semibold text-ivory whitespace-nowrap">{priceLabel}</p>
      </LocaleLink>

      {hasVariants && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {variants!.map((v, i) => {
            const isActive = active === i;
            const sw = v.swatch ?? "#cccccc";
            // Bille physique : reflet en haut, ombre interne en bas. Active = fin
            // liseré ivoire + lueur à sa propre couleur (bijou allumé).
            const bead = "inset 0 1px 0.5px rgba(255,255,255,0.45), inset 0 -1.5px 2px rgba(0,0,0,0.3)";
            return (
              <button
                key={v.name}
                type="button"
                aria-label={interpolate(dict.productPage.variantSwatchLabel, { color: v.name })}
                aria-pressed={isActive}
                title={v.name}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="grid h-6 w-6 place-items-center rounded-[7px] transition-transform duration-100 ease-out active:scale-90 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
              >
                <motion.span
                  aria-hidden
                  className={`block h-[15px] w-[15px] rounded-[4px] transition-[opacity,box-shadow] duration-300 ease-out-expo motion-reduce:transition-none ${
                    isActive ? "opacity-100" : "opacity-60"
                  }`}
                  style={{
                    background: sw,
                    boxShadow: isActive
                      ? `${bead}, 0 0 0 1.5px rgba(245,240,230,0.95), 0 3px 10px -2px ${sw}`
                      : `${bead}, 0 0 0 1px rgba(245,240,230,0.2)`,
                  }}
                  animate={reduce ? { scale: 1, y: 0 } : { scale: isActive ? 1.16 : 1, y: isActive ? -1 : 0 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.34 }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
