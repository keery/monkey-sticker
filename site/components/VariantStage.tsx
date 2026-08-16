"use client";

// Grande carte « stage » de la fiche produit (adaptation de l'Avatar Picker) :
//  · anneau de couleur animé, à la teinte de la variante choisie ;
//  · crossfade de l'artwork quand on change de couleur.
// Lit la sélection partagée (puce + variante) du contexte ChipSelection. Sans
// variantes de couleur, se comporte comme un simple aperçu (anneau neutre).

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CARD } from "@/lib/site";
import type { ImageTransform, ProductVariant, Theme } from "@/lib/products";
import { CardVisual } from "./CardVisual";
import { useChipSelection } from "./ChipSelection";

const ASPECT = `${CARD.widthMm} / ${CARD.heightMm}`;
// Même rayon de coins que la carte (ratio exact) pour que l'anneau l'épouse.
const RADIUS = `${((CARD.cornerRadiusMm / CARD.widthMm) * 100).toFixed(2)}% / ${(
  (CARD.cornerRadiusMm / CARD.heightMm) * 100
).toFixed(2)}%`;

// "#rrggbb" → "r, g, b" pour composer des rgba() interpolables par Motion.
function rgbOf(hex?: string): string | null {
  if (!hex) return null;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function VariantStage({
  image,
  theme,
  seed,
  transform,
  background,
  variants,
  className,
}: {
  image?: string;
  theme: Theme;
  seed: string;
  transform?: ImageTransform;
  background?: string;
  variants?: ProductVariant[];
  className?: string;
}) {
  const { chip, notch, variant } = useChipSelection();
  const reduce = useReducedMotion();

  const hasVariants = (variants?.length ?? 0) >= 2;
  const shownImage = variant?.image ?? image;
  const shownBackground = variant?.background ?? background;

  // Teinte de l'anneau : swatch de la variante choisie, sinon la 1ʳᵉ variante.
  const rgb = useMemo(
    () => rgbOf(variant?.swatch ?? variants?.[0]?.swatch ?? theme.colors[0]),
    [variant?.swatch, variants, theme.colors],
  );
  // Même langage de lumière que les vignettes : fin liseré à la couleur + halo
  // de galerie diffus (deux portées) plutôt qu'une ombre unique et dure.
  const ring =
    hasVariants && rgb
      ? `0 0 0 1.5px rgba(${rgb}, 0.5), 0 24px 64px -16px rgba(${rgb}, 0.42), 0 8px 22px -8px rgba(${rgb}, 0.28)`
      : "0 0 0 0 rgba(0, 0, 0, 0), 0 0 0 0 rgba(0, 0, 0, 0), 0 0 0 0 rgba(0, 0, 0, 0)";

  return (
    <motion.div
      className={`relative ${className ?? ""}`}
      style={{ aspectRatio: ASPECT, borderRadius: RADIUS }}
      initial={false}
      animate={{ boxShadow: ring }}
      transition={reduce ? { duration: 0 } : { duration: 0.45, ease: "easeOut" }}
    >
      {/* Crossfade de l'artwork : chaque image est une couche superposée. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={shownImage ?? "base"}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
        >
          <CardVisual
            image={shownImage}
            theme={theme}
            seed={seed}
            transform={transform}
            background={shownBackground}
            chipSize={chip}
            notch={notch === "notch"}
            className="h-full w-full"
          />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
