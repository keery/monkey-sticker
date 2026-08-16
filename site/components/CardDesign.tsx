// Visuel de carte généré en SVG — remplace les photos produits (aucune image copiée).
// Ratio et cotes exactes ISO ID-1 ; la puce est dessinée à la position réelle
// de la fenêtre cardcut pour un rendu fidèle au produit final.

import { CARD, CHIP_PLATES, type ChipSize } from "@/lib/site";
import type { Theme } from "@/lib/products";
import { cardSilhouetteD } from "@/lib/card-art";

// viewBox en dixièmes de mm : 856 × 540 (arrondi 539,8)
const W = 856;
const H = 540;
const R = CARD.cornerRadiusMm * 10;
const CHIP = {
  x: CARD.chipWindow.xMm * 10,
  y: CARD.chipWindow.yMm * 10,
  w: CARD.chipWindow.wMm * 10,
  h: CARD.chipWindow.hMm * 10,
};
// Plaque dorée aux cotes du format choisi, centrée dans la fenêtre puce.
function plate(size: Exclude<ChipSize, "none">) {
  const w = CHIP_PLATES[size].wMm * 10;
  const h = CHIP_PLATES[size].hMm * 10;
  return { w, h, x: CHIP.x + (CHIP.w - w) / 2, y: CHIP.y + (CHIP.h - h) / 2 };
}

// PRNG déterministe par graine (mulberry32) — mêmes visuels à chaque rendu.
function rng(seed: string) {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function patternElements(theme: Theme, seed: string): React.ReactNode {
  const rand = rng(seed);
  const [c1, c2, c3] = [theme.colors[0], theme.colors[1], theme.colors[2] ?? theme.colors[0]];
  switch (theme.pattern) {
    case "gradient":
      return null; // le fond dégradé suffit
    case "waves": {
      const paths = [];
      for (let i = 0; i < 5; i++) {
        const y0 = 80 + i * 110 + rand() * 40;
        const amp = 30 + rand() * 45;
        paths.push(
          <path
            key={i}
            d={`M -40 ${y0} C ${W * 0.25} ${y0 - amp}, ${W * 0.4} ${y0 + amp}, ${W * 0.6} ${y0} S ${W * 0.9} ${y0 - amp}, ${W + 40} ${y0 + amp * 0.4}`}
            fill="none"
            stroke={i % 2 ? c2 : c3}
            strokeWidth={14 + rand() * 22}
            strokeLinecap="round"
            opacity={0.5 + rand() * 0.4}
          />,
        );
      }
      return paths;
    }
    case "stripes": {
      const stripes = [];
      for (let i = -4; i < 14; i++) {
        stripes.push(
          <rect
            key={i}
            x={i * 90}
            y={-120}
            width={38 + rand() * 26}
            height={H + 240}
            fill={i % 2 ? c2 : c3}
            opacity={0.85}
            transform={`rotate(18 ${W / 2} ${H / 2})`}
          />,
        );
      }
      return stripes;
    }
    case "dots": {
      const dots = [];
      for (let i = 0; i < 42; i++) {
        dots.push(
          <circle
            key={i}
            cx={rand() * W}
            cy={rand() * H}
            r={6 + rand() * 22}
            fill={rand() > 0.5 ? c2 : c3}
            opacity={0.5 + rand() * 0.5}
          />,
        );
      }
      return dots;
    }
    case "rays": {
      const rays = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        rays.push(
          <polygon
            key={i}
            points={`${W * 0.72},${H * 0.4} ${W * 0.72 + Math.cos(a) * 900},${H * 0.4 + Math.sin(a) * 900} ${W * 0.72 + Math.cos(a + 0.16) * 900},${H * 0.4 + Math.sin(a + 0.16) * 900}`}
            fill={i % 2 ? c2 : c3}
            opacity={0.28}
          />,
        );
      }
      return rays;
    }
    case "floral": {
      const flowers = [];
      for (let i = 0; i < 9; i++) {
        const cx = rand() * W;
        const cy = rand() * H;
        const r = 22 + rand() * 34;
        const petals = [];
        for (let p = 0; p < 6; p++) {
          const a = (p / 6) * Math.PI * 2;
          petals.push(
            <ellipse
              key={p}
              cx={cx + Math.cos(a) * r}
              cy={cy + Math.sin(a) * r}
              rx={r * 0.75}
              ry={r * 0.45}
              fill={rand() > 0.4 ? c2 : c3}
              opacity={0.75}
              transform={`rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r})`}
            />,
          );
        }
        flowers.push(
          <g key={i}>
            {petals}
            <circle cx={cx} cy={cy} r={r * 0.4} fill={c1} opacity={0.9} />
          </g>,
        );
      }
      return flowers;
    }
    case "grid": {
      const lines = [];
      for (let x = 0; x <= W; x += 64) {
        lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke={c2} strokeWidth={3} opacity={0.55} />);
      }
      for (let y = 0; y <= H; y += 64) {
        lines.push(<line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke={c3} strokeWidth={3} opacity={0.4} />);
      }
      return lines;
    }
    case "camo": {
      const blobs = [];
      for (let i = 0; i < 16; i++) {
        const cx = rand() * W;
        const cy = rand() * H;
        const r1 = 50 + rand() * 80;
        blobs.push(
          <path
            key={i}
            d={`M ${cx} ${cy} q ${r1} ${-r1 * 0.6} ${r1 * 1.6} 0 q ${r1 * 0.8} ${r1 * 0.7} -${r1 * 0.4} ${r1} q -${r1 * 1.4} ${r1 * 0.5} -${r1 * 1.8} -${r1 * 0.3} q -${r1 * 0.3} -${r1 * 0.5} ${r1 * 0.6} -${r1 * 0.7} Z`}
            fill={theme.colors[1 + Math.floor(rand() * (theme.colors.length - 1))]}
            opacity={0.8}
          />,
        );
      }
      return blobs;
    }
  }
}

export function CardDesign({
  theme,
  seed,
  showChip = true,
  chipSize = "small",
  notch = false,
  className,
  preserveAspectRatio,
}: {
  theme: Theme;
  seed: string;
  showChip?: boolean;
  /** format de la puce dessinée — "none" = aucune puce (par défaut petite) */
  chipSize?: ChipSize;
  /** découpe l'encoche d'accessibilité sur le bord droit (repère tactile) */
  notch?: boolean;
  className?: string;
  // "xMidYMid slice" (= cover) pour remplir une zone au ratio différent, ex.
  // la couche de fond perdu à l'impression. Défaut navigateur = meet (contain).
  preserveAspectRatio?: string;
}) {
  const gid = `g-${seed.replace(/[^a-z0-9]/gi, "")}`;
  const p = chipSize === "none" ? null : plate(chipSize);
  // Silhouette (userSpace 856×540) : rectangle arrondi + encoche si demandée.
  const notchPath = notch ? cardSilhouetteD(true, W, H) : null;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio={preserveAspectRatio}
      role="img"
      aria-label={`Design ${seed}`}
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          {theme.colors.map((c, i) => (
            <stop key={i} offset={`${(i / (theme.colors.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        <clipPath id={`${gid}-clip`}>
          {notchPath ? <path d={notchPath} /> : <rect x="0" y="0" width={W} height={H} rx={R} />}
        </clipPath>
        <linearGradient id={`${gid}-chip`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e8c86e" />
          <stop offset="50%" stopColor="#c9a13b" />
          <stop offset="100%" stopColor="#e5be5a" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${gid}-clip)`}>
        <rect x="0" y="0" width={W} height={H} fill={`url(#${gid})`} />
        {patternElements(theme, seed)}
        {/* léger vernis */}
        <rect x="0" y="0" width={W} height={H} fill="white" opacity="0.05" />
      </g>
      {showChip && p && (
        // Puce dessinée au centre de la fenêtre réelle (cotes cardcut)
        <g>
          <rect
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            rx="14"
            fill={`url(#${gid}-chip)`}
            stroke={theme.dark ? "#00000055" : "#00000033"}
          />
          <path
            d={`M ${p.x} ${CHIP.y + CHIP.h / 2} h ${p.w} M ${CHIP.x + CHIP.w / 2} ${p.y} v ${p.h}`}
            stroke="#00000040"
            strokeWidth="4"
            fill="none"
          />
        </g>
      )}
      {notchPath ? (
        <path d={notchPath} fill="none" stroke={theme.dark ? "#ffffff26" : "#00000014"} strokeWidth="3" />
      ) : (
        <rect
          x="1.5"
          y="1.5"
          width={W - 3}
          height={H - 3}
          rx={R}
          fill="none"
          stroke={theme.dark ? "#ffffff26" : "#00000014"}
          strokeWidth="3"
        />
      )}
    </svg>
  );
}
