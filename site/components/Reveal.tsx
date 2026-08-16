"use client";

// Révélation à l'entrée dans le viewport (IntersectionObserver).
// Les styles vivent dans globals.css ([data-reveal] / .in-view) ; `delay`
// décale la transition pour orchestrer une chorégraphie en cascade.
// `bare` ne masque pas le wrapper : seuls ses descendants stylés sur
// `.in-view` (ex. .line-reveal-inner) s'animent.
//
// `load` : mode above-the-fold. La révélation est jouée en CSS pur (classes
// .reveal-load / .reveal-load-lines) dès le premier paint, sans observer ni
// hydratation — le hero reste visible même si le JS tarde (protège le LCP).

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export function Reveal({
  children,
  className,
  delay = 0,
  bare = false,
  load = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  bare?: boolean;
  load?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // En mode `load`, l'animation est 100 % CSS : pas d'observer à câbler.
    if (load) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  const revealClass = load ? (bare ? "reveal-load-lines" : "reveal-load") : "";
  const merged = [revealClass, className].filter(Boolean).join(" ");

  return (
    <div
      ref={ref}
      data-reveal={bare || load ? undefined : ""}
      className={merged || undefined}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
