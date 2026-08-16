// Primitives présentationnelles de l'atelier — partagées par toutes les pages
// pour garder un vocabulaire strictement identique d'un écran à l'autre.
// Pas de « use client » : utilisables directement dans les composants serveur.

import type { ReactNode } from "react";
import { panel } from "@/lib/admin-ui";

/** En-tête de page : titre + sous-titre à gauche, actions à droite. */
export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-none text-ivory">{title}</h1>
        {sub && <p className="mt-2 text-sm text-ivory-dim">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/** Pastille de statut : point + libellé, couleurs sémantiques cohérentes. */
export function Badge({
  label,
  cls,
  dot,
}: {
  label: string;
  cls: string;
  dot?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
}

/** Une mesure du bandeau de pilotage : valeur nette, libellé discret. */
export function Metric({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-4 first:pl-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ivory-dim/70">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-semibold tabular-nums leading-none ${
          accent ? "text-flame" : "text-ivory"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-ivory-dim/80">{hint}</p>}
    </div>
  );
}

/** Bandeau de mesures : ligne de métriques séparées par de fins traits. */
export function MetricStrip({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${panel} flex flex-wrap divide-x divide-white/[0.07] overflow-hidden px-5`}
    >
      {children}
    </div>
  );
}

/** État vide qui enseigne l'interface plutôt que « rien ici ». */
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`${panel} flex flex-col items-center gap-3 px-8 py-16 text-center`}
    >
      {icon && <div className="text-ivory-dim/50">{icon}</div>}
      <p className="text-base font-semibold text-ivory">{title}</p>
      {children && (
        <div className="max-w-md text-sm leading-relaxed text-ivory-dim">{children}</div>
      )}
    </div>
  );
}
