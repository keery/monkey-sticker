"use client";

// Sélecteur d'encoche : certaines cartes ont une petite encoche sur le bord
// opposé à la puce (repère tactile / sens d'insertion). Le client indique si la
// sienne en a une ; l'illustration montre le bord de la carte, droit ou entaillé,
// pour que le choix se lise d'un coup d'œil (même langage que le sélecteur de
// puce : la carte EST le guide).

import type { NotchChoice } from "@/lib/site";
import { useI18n } from "@/lib/i18n/context";

// Mini-carte aux proportions ISO ID-1, puce dorée à gauche, encoche optionnelle
// sur le bord droit (arc concave, vers l'intérieur de la carte).
function CardOutline({ notch, dark }: { notch: boolean; dark: boolean }) {
  const face = dark ? "#e9e4d6" : "#f6f3ea";
  const edge = notch
    ? // bord droit interrompu par une encoche semi-circulaire (arc vers l'intérieur)
      "V 20 A 5 5 0 0 0 77 30 V 43"
    : "V 43";
  return (
    <svg viewBox="0 0 80 50" className="h-full w-full" aria-hidden>
      <path
        d={`M 7 3 H 73 A 4 4 0 0 1 77 7 ${edge} A 4 4 0 0 1 73 47 H 7 A 4 4 0 0 1 3 43 V 7 A 4 4 0 0 1 7 3 Z`}
        fill={face}
        stroke="rgba(0,0,0,0.28)"
        strokeWidth="1"
      />
      {/* puce dorée à gauche (repère du côté opposé à l'encoche) */}
      <rect x="8" y="19" width="12" height="12" rx="2" fill="#c9a13b" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
    </svg>
  );
}

export function NotchPicker({
  value,
  onChange,
  tone = "light",
}: {
  value: NotchChoice;
  onChange: (choice: NotchChoice) => void;
  tone?: "light" | "dark";
}) {
  const { dict } = useI18n();
  const dark = tone === "dark";
  const options: NotchChoice[] = ["none", "notch"];
  return (
    <div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={dict.notch.ariaLabel}>
        {options.map((key) => {
          const t = dict.notch.options[key];
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(key)}
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
              <span className="mx-auto flex h-9 w-[3.4rem] items-center justify-center">
                <CardOutline notch={key === "notch"} dark={dark} />
              </span>
              <span className={`mt-1.5 block text-xs font-bold ${dark ? "text-ivory" : "text-neutral-900"}`}>
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
      <p className={`mt-2 text-xs ${dark ? "text-ivory-dim" : "text-neutral-500"}`}>{dict.notch.hint}</p>
    </div>
  );
}
