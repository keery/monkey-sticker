"use client";

// Vignette de design cliquable : au clic, ouvre une lightbox qui agrandit
// le visuel de carte pour l'inspecter en grand (idées de la veille, etc.).

import { useEffect, useState } from "react";
import type { ImageTransform, Theme } from "@/lib/products";
import { CardVisual } from "@/components/CardVisual";

export function DesignThumb({
  image,
  theme,
  seed,
  name,
  transform,
  background,
  className,
}: {
  image?: string;
  theme: Theme;
  seed: string;
  name: string;
  transform?: ImageTransform;
  background?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Agrandir le design « ${name} »`}
        className={`group relative block cursor-zoom-in overflow-hidden rounded-lg border border-white/10 outline-none transition-[border-color,transform] duration-150 hover:border-white/30 focus-visible:ring-2 focus-visible:ring-flame/50 ${className ?? ""}`}
      >
        {/* Aucune puce sur l'aperçu : le design est full-bleed, la puce (découpe) vient à l'impression. */}
        <CardVisual image={image} theme={theme} seed={seed} transform={transform} background={background} showChip={false} className="w-full" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-night/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-ivory" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-8"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Design « ${name} »`}
        >
          <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <CardVisual image={image} theme={theme} seed={seed} transform={transform} background={background} showChip={false} className="w-full" />
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-ivory">{name}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-night text-ivory transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
