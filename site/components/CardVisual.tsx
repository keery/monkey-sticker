// Visuel de carte unifié : image réelle (artwork du studio ou upload) placée
// sur la carte via un transform non destructif (échelle / position / rotation
// défini dans l'éditeur admin), avec puce en surimpression ; sinon repli sur le
// SVG généré. Sans transform, l'image couvre la carte comme un `object-cover`
// centré — comportement d'origine.

import { CARD, CHIP_PLATES, type ChipSize } from "@/lib/site";
import type { ImageTransform, Theme } from "@/lib/products";
import { ART_VIEWBOX, IDENTITY_TRANSFORM, cardSilhouetteD, svgArtTransform } from "@/lib/card-art";
import { CardDesign } from "./CardDesign";

const CHIP = {
  left: (CARD.chipWindow.xMm / CARD.widthMm) * 100,
  top: (CARD.chipWindow.yMm / CARD.heightMm) * 100,
  width: (CARD.chipWindow.wMm / CARD.widthMm) * 100,
  height: (CARD.chipWindow.hMm / CARD.heightMm) * 100,
};
// Inset (en %) de la plaque dorée dans la fenêtre puce, selon le format : la
// plaque reste centrée sur le même centre contacts, seule sa taille change.
function plateInset(size: Exclude<ChipSize, "none">) {
  return {
    x: (((CARD.chipWindow.wMm - CHIP_PLATES[size].wMm) / 2 / CARD.chipWindow.wMm) * 100).toFixed(1),
    y: (((CARD.chipWindow.hMm - CHIP_PLATES[size].hMm) / 2 / CARD.chipWindow.hMm) * 100).toFixed(1),
  };
}
const RX = (CARD.cornerRadiusMm / CARD.widthMm) * 100;
const RY = (CARD.cornerRadiusMm / CARD.heightMm) * 100;

export function CardVisual({
  image,
  theme,
  seed,
  transform,
  background,
  showChip = true,
  chipSize = "small",
  notch = false,
  className,
}: {
  image?: string;
  theme: Theme;
  seed: string;
  /** cadrage de l'image sur la carte — absent = cover centré (identité) */
  transform?: ImageTransform;
  /** couleur de fond derrière l'image — absent = couleur du thème */
  background?: string;
  showChip?: boolean;
  /** format de la puce dessinée — "none" = aucune puce (par défaut petite) */
  chipSize?: ChipSize;
  /** découpe l'encoche d'accessibilité sur le bord droit (repère tactile) */
  notch?: boolean;
  className?: string;
}) {
  if (!image) {
    return <CardDesign theme={theme} seed={seed} showChip={showChip} chipSize={chipSize} notch={notch} className={className} />;
  }
  const t = transform ?? IDENTITY_TRANSFORM;
  const bg = background ?? theme.colors[0];
  const plate = chipSize === "none" ? null : plateInset(chipSize);
  // Encoche : on découpe toute la silhouette (artwork + puce + liseré) via un
  // clip-path en coordonnées objectBoundingBox → responsive et demi-cercle rond.
  // Id dérivé de la graine pour rester unique quand plusieurs cartes coexistent.
  const clipId = `notch-${seed.replace(/[^a-z0-9]/gi, "")}`;
  const clip = notch ? `url(#${clipId})` : undefined;
  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{
        aspectRatio: `${CARD.widthMm} / ${CARD.heightMm}`,
        borderRadius: `${RX.toFixed(2)}% / ${RY.toFixed(2)}%`,
        clipPath: clip,
        WebkitClipPath: clip,
      }}
    >
      {notch && (
        <svg width="0" height="0" aria-hidden className="absolute">
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path d={cardSilhouetteD(true)} />
            </clipPath>
          </defs>
        </svg>
      )}
      {/* Image placée dans le repère carte (dixièmes de mm). `slice` = cover ;
          le <g> applique échelle / position / rotation. Le fond reprend la
          couleur du thème pour ne pas laisser de vide si l'image ne couvre plus
          toute la carte (zoom arrière / rotation). */}
      <svg
        viewBox={`0 0 ${ART_VIEWBOX.w} ${ART_VIEWBOX.h}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={seed}
      >
        <rect x="0" y="0" width={ART_VIEWBOX.w} height={ART_VIEWBOX.h} fill={bg} />
        <g transform={svgArtTransform(t, ART_VIEWBOX.w, ART_VIEWBOX.h)}>
          <image
            href={image}
            x="0"
            y="0"
            width={ART_VIEWBOX.w}
            height={ART_VIEWBOX.h}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      </svg>
      {showChip && plate && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${CHIP.left}%`,
            top: `${CHIP.top}%`,
            width: `${CHIP.width}%`,
            height: `${CHIP.height}%`,
          }}
        >
          <div
            className="absolute rounded-md bg-gradient-to-br from-[#e8c86e] via-[#c9a13b] to-[#e5be5a] border border-black/30 shadow-sm"
            style={{
              left: `${plate.x}%`,
              right: `${plate.x}%`,
              top: `${plate.y}%`,
              bottom: `${plate.y}%`,
            }}
          />
        </div>
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
      />
    </div>
  );
}
