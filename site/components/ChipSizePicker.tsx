"use client";

// Sélecteur de taille de puce : le guide EST le sélecteur. Chaque option
// montre la plaque dorée aux cotes réelles du module (CHIP_PLATES, celles
// des aperçus carte), à une échelle mm → px commune : grande presque carrée,
// petite plus large que haute, comme sur les vraies cartes.

import { CHIP_PLATES, CHIP_SIZES, type ChipSize } from "@/lib/site";
import { useI18n } from "@/lib/i18n/context";

const PX_PER_MM = 2.4;

function plateStyle(size: Exclude<ChipSize, "none">) {
  const p = CHIP_PLATES[size];
  return {
    width: Math.round(p.wMm * PX_PER_MM),
    height: Math.round(p.hMm * PX_PER_MM),
  };
}

export function ChipSizePicker({
  value,
  onChange,
  tone = "light",
}: {
  value: ChipSize;
  onChange: (size: ChipSize) => void;
  tone?: "light" | "dark";
}) {
  const { dict } = useI18n();
  const dark = tone === "dark";
  return (
    <div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={dict.chip.ariaLabel}>
        {CHIP_SIZES.map((c) => {
          const t = dict.chip.sizes[c.key];
          const active = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(c.key)}
              className={`relative rounded-2xl border px-3 pt-3 pb-2.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                dark
                  ? `focus-visible:outline-flame ${
                      active ? "border-flame bg-flame/10" : "border-white/15 hover:border-white/40"
                    }`
                  : `focus-visible:outline-black ${
                      active ? "border-black bg-neutral-100" : "border-neutral-200 hover:border-neutral-400"
                    }`
              }`}
            >
              {t.tag && (
                <span
                  className={`absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                    dark ? "bg-ivory text-night" : "bg-black text-white"
                  }`}
                >
                  {t.tag}
                </span>
              )}
              <span className="flex h-9 items-center justify-center">
                {c.key === "none" ? (
                  <span
                    aria-hidden
                    className={`rounded-md border-2 border-dashed ${
                      dark ? "border-white/30" : "border-neutral-300"
                    }`}
                    style={plateStyle("small")}
                  />
                ) : (
                  <span
                    aria-hidden
                    className="rounded-md bg-gradient-to-br from-[#e8c86e] via-[#c9a13b] to-[#e5be5a] border border-black/30 shadow-sm"
                    style={plateStyle(c.key)}
                  />
                )}
              </span>
              <span
                className={`mt-1.5 block text-xs font-bold ${dark ? "text-ivory" : "text-neutral-900"}`}
              >
                {t.label}
              </span>
              <span
                className={`mt-0.5 block text-[10px] leading-tight ${
                  dark ? "text-ivory-dim" : "text-neutral-500"
                }`}
              >
                {t.hint}
              </span>
            </button>
          );
        })}
      </div>
      <p className={`mt-2 text-xs ${dark ? "text-ivory-dim" : "text-neutral-500"}`}>
        {dict.chip.compareHint}
      </p>
    </div>
  );
}
