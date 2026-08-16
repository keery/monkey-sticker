"use client";

// Sélecteur de langue. Reconstruit le chemin courant sans le préfixe de locale,
// puis applique le préfixe de la langue choisie (rien pour l'anglais par défaut).
// Pose le cookie NEXT_LOCALE AVANT la navigation — indispensable au passage vers
// l'anglais (sinon le proxy re-redirigerait vers l'ancienne langue mémorisée).

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_LOCALE,
  isLocale,
  localePath,
  LOCALE_FLAGS,
  LOCALE_LABELS,
  LOCALES,
} from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

/** Retire un éventuel préfixe de locale non-défaut du chemin. */
function stripLocale(pathname: string): string {
  const seg = pathname.split("/")[1];
  if (isLocale(seg) && seg !== DEFAULT_LOCALE) {
    const rest = pathname.slice(seg.length + 1);
    return rest || "/";
  }
  return pathname || "/";
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function choose(target: (typeof LOCALES)[number]) {
    const bare = stripLocale(pathname || "/");
    document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.assign(localePath(bare, target));
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={dict.language.label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2 py-2 text-sm font-medium hover:opacity-60 transition-opacity"
      >
        <span aria-hidden className="text-base leading-none">{LOCALE_FLAGS[locale]}</span>
        <span className="uppercase">{locale}</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 min-w-44 rounded-xl border border-white/10 bg-night py-1 shadow-2xl z-50"
        >
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => choose(l)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 ${
                  l === locale ? "text-ivory font-semibold" : "text-ivory-dim"
                }`}
              >
                <span aria-hidden className="text-base leading-none">{LOCALE_FLAGS[l]}</span>
                <span>{LOCALE_LABELS[l]}</span>
                {l === locale && (
                  <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 text-flame" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
