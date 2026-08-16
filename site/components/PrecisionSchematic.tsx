// Schéma coté de la découpe (unités = dixièmes de mm, cotes réelles cardcut).
// Les tracés se dessinent quand la section entre à l'écran : le wrapper
// Reveal pose .in-view, globals.css anime stroke-dashoffset (.draw) et
// l'apparition des cotes (.schem-label).
import { CARD, CHIP_WINDOWS } from "@/lib/site";
import { lang } from "next/root-params";
import { isLocale, DEFAULT_LOCALE, LOCALE_INTL } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { interpolate } from "@/lib/i18n/interpolate";

const STROKE = {
  outline: "var(--color-ivory)",
  chip: "var(--color-flame)",
  dim: "var(--color-ivory-dim)",
};

// La fenêtre dessinée = la PETITE puce (la plus courante, celle affichée
// partout ailleurs sur le site) — cote réelle, pas de carré 16 × 16 fictif.
const SCALE = 10; // 1 mm = 10 unités SVG
const ORIGIN = { x: 140, y: 110 }; // coin haut-gauche de la carte dans le viewBox
const CHIP = CHIP_WINDOWS.small; // { xMm: 8, yMm: 18.5, wMm: 14, hMm: 11, rMm: 1.8 }
const chipBox = {
  x: ORIGIN.x + CHIP.xMm * SCALE,
  y: ORIGIN.y + CHIP.yMm * SCALE,
  w: CHIP.wMm * SCALE,
  h: CHIP.hMm * SCALE,
  rx: CHIP.rMm * SCALE,
};

function Label({
  x,
  y,
  children,
  anchor = "middle",
  fill = STROKE.dim,
  delay = "0.8s",
  rotate,
}: {
  x: number;
  y: number;
  children: string;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  delay?: string;
  rotate?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={fill}
      fontSize="26"
      letterSpacing="0.06em"
      className="schem-label font-mono"
      style={{ transitionDelay: delay }}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {children}
    </text>
  );
}

export async function PrecisionSchematic({ className }: { className?: string }) {
  const raw = await lang();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  const nf = (n: number) => n.toLocaleString(LOCALE_INTL[locale]);

  return (
    <svg
      viewBox="0 0 1060 730"
      className={className}
      role="img"
      aria-label={interpolate(dict.home.schematic.ariaLabel, {
        width: nf(CARD.widthMm),
        height: nf(CARD.heightMm),
        chipW: nf(CHIP.wMm),
        chipH: nf(CHIP.hMm),
        edge: nf(CHIP.xMm),
        radius: nf(CARD.cornerRadiusMm),
      })}
    >
      {/* contour de la carte (856 × 540, r 31,8) */}
      <rect
        x="140"
        y="110"
        width="856"
        height="540"
        rx="31.8"
        fill="none"
        stroke={STROKE.outline}
        strokeWidth="2.5"
        opacity="0.9"
        pathLength={1}
        className="draw"
      />
      {/* fenêtre petite puce (14 × 11 mm à 8 / 18,5 mm) */}
      <rect
        x={chipBox.x}
        y={chipBox.y}
        width={chipBox.w}
        height={chipBox.h}
        rx={chipBox.rx}
        fill="none"
        stroke={STROKE.chip}
        strokeWidth="2.5"
        pathLength={1}
        className="draw"
        style={{ transitionDelay: "0.35s" }}
      />

      {/* cote largeur */}
      <g stroke={STROKE.dim} strokeWidth="1.5" opacity="0.75">
        <line x1="140" y1="56" x2="140" y2="76" pathLength={1} className="draw" style={{ transitionDelay: "0.55s" }} />
        <line x1="996" y1="56" x2="996" y2="76" pathLength={1} className="draw" style={{ transitionDelay: "0.55s" }} />
        <line x1="140" y1="66" x2="996" y2="66" pathLength={1} className="draw" style={{ transitionDelay: "0.6s" }} />
      </g>
      <Label x={568} y={48} delay="0.9s">
        {`${nf(CARD.widthMm)} mm`}
      </Label>

      {/* cote hauteur */}
      <g stroke={STROKE.dim} strokeWidth="1.5" opacity="0.75">
        <line x1="74" y1="110" x2="94" y2="110" pathLength={1} className="draw" style={{ transitionDelay: "0.7s" }} />
        <line x1="74" y1="650" x2="94" y2="650" pathLength={1} className="draw" style={{ transitionDelay: "0.7s" }} />
        <line x1="84" y1="110" x2="84" y2="650" pathLength={1} className="draw" style={{ transitionDelay: "0.75s" }} />
      </g>
      <Label x={62} y={380} rotate={-90} delay="1s">
        {`${nf(CARD.heightMm)} mm`}
      </Label>

      {/* repère fenêtre puce */}
      <line
        x1={chipBox.x + chipBox.w}
        y1={chipBox.y + chipBox.h / 2}
        x2="510"
        y2="316"
        stroke={STROKE.dim}
        strokeWidth="1.5"
        opacity="0.75"
        pathLength={1}
        className="draw"
        style={{ transitionDelay: "0.9s" }}
      />
      <Label x={524} y={322} anchor="start" fill={STROKE.chip} delay="1.1s">
        {interpolate(dict.home.schematic.chipWindow, {
          w: nf(CHIP.wMm),
          h: nf(CHIP.hMm),
        })}
      </Label>

      {/* repère rayon de coin */}
      <line
        x1="982"
        y1="120"
        x2="1020"
        y2="82"
        stroke={STROKE.dim}
        strokeWidth="1.5"
        opacity="0.75"
        pathLength={1}
        className="draw"
        style={{ transitionDelay: "0.95s" }}
      />
      <Label x={1036} y={72} anchor="end" delay="1.15s">
        {interpolate(dict.home.schematic.cornerRadius, { r: nf(CARD.cornerRadiusMm) })}
      </Label>

      {/* cote bord gauche → puce */}
      <g stroke={STROKE.dim} strokeWidth="1.5" opacity="0.75">
        <line x1={ORIGIN.x} y1="680" x2={ORIGIN.x} y2="700" pathLength={1} className="draw" style={{ transitionDelay: "1s" }} />
        <line x1={chipBox.x} y1="680" x2={chipBox.x} y2="700" pathLength={1} className="draw" style={{ transitionDelay: "1s" }} />
        <line x1={ORIGIN.x} y1="690" x2={chipBox.x} y2="690" pathLength={1} className="draw" style={{ transitionDelay: "1.05s" }} />
      </g>
      <Label x={(ORIGIN.x + chipBox.x) / 2} y={722} delay="1.2s">
        {`${CHIP.xMm.toLocaleString(LOCALE_INTL[locale], { minimumFractionDigits: 1 })} mm`}
      </Label>
    </svg>
  );
}
