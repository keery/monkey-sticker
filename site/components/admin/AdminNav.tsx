"use client";

// Navigation de l'atelier : barre latérale pleine hauteur sur desktop,
// tiroir coulissant sur mobile. État actif via le chemin courant, pastilles
// de charge vive (commandes à imprimer, idées en attente).

import { useEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { Wordmark } from "@/components/Wordmark";
import { logoutAction } from "@/lib/auth-actions";

type Item = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => ReactElement;
  exact?: boolean;
  matchPrefix?: string;
  badge?: number;
  accentBadge?: boolean;
};

type Group = { title: string; items: Item[] };

// --- Icônes (trait 1.7, même famille que le header du site) -----------------
const I = {
  overview: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  orders: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2l1.5 1.5L9 2l1.5 1.5L12 2l1.5 1.5L15 2l1.5 1.5L18 2v20l-1.5-1.5L15 22l-1.5-1.5L12 22l-1.5-1.5L9 22l-1.5-1.5L6 22V2z" /><path d="M9 8h6M9 12h6" />
    </svg>
  ),
  print: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 17h10v4H7z" /><circle cx="17" cy="12.5" r=".6" fill="currentColor" />
    </svg>
  ),
  designs: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="14" height="9" rx="2" /><path d="M8 18h13M6.5 21h11" />
    </svg>
  ),
  categories: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
    </svg>
  ),
  ideas: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 3.4L17 8l-3.4 1.6L12 13l-1.6-3.4L7 8l3.4-1.6L12 3z" /><path d="M18 14l.8 1.7L20.5 16.5 18.8 17.3 18 19l-.8-1.7L15.5 16.5l1.7-.8L18 14z" />
    </svg>
  ),
  newsletter: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 6 8-6" />
    </svg>
  ),
  emails: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 13h10M7 16h6" />
    </svg>
  ),
};

const GROUPS: Group[] = [
  { title: "Pilotage", items: [{ href: "/admin", label: "Vue d'ensemble", icon: I.overview, exact: true }] },
  {
    title: "Production",
    items: [
      { href: "/admin/orders", label: "Commandes", icon: I.orders, accentBadge: true },
      { href: "/admin/print/batch", label: "Impression", icon: I.print, matchPrefix: "/admin/print" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/designs", label: "Designs", icon: I.designs },
      { href: "/admin/categories", label: "Catégories", icon: I.categories },
      { href: "/admin/ideas", label: "Idées", icon: I.ideas },
    ],
  },
  {
    title: "Audience",
    items: [
      { href: "/admin/newsletter", label: "Newsletter", icon: I.newsletter },
      { href: "/admin/emails", label: "Emails", icon: I.emails },
    ],
  },
];

function isActive(pathname: string, item: Item): boolean {
  if (item.exact) return pathname === item.href;
  if (pathname === item.href) return true;
  return pathname.startsWith((item.matchPrefix ?? item.href) + "/");
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-2">
      <Image src={SITE.logo} alt={SITE.name} width={34} height={28} className="h-7 w-auto" priority />
      <span className="flex flex-col leading-none">
        <Wordmark className="text-[0.82rem]" />
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          Atelier
        </span>
      </span>
    </Link>
  );
}

function NavList({
  pathname,
  counts,
  onNavigate,
}: {
  pathname: string;
  counts: { orders?: number; ideas?: number };
  onNavigate?: () => void;
}) {
  const badgeFor = (item: Item): number | undefined => {
    if (item.href === "/admin/orders") return counts.orders || undefined;
    if (item.href === "/admin/ideas") return counts.ideas || undefined;
    return undefined;
  };

  return (
    <nav className="flex flex-col gap-6">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory-dim/50">
            {g.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const active = isActive(pathname, item);
              const badge = badgeFor(item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                      active
                        ? "bg-flame/[0.14] text-flame"
                        : "text-ivory-dim hover:bg-white/[0.05] hover:text-ivory"
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-flame" : "text-ivory-dim group-hover:text-ivory"}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge != null && (
                      <span
                        className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums ${
                          item.accentBadge
                            ? "bg-flame text-night"
                            : "bg-white/10 text-ivory"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminNav({
  counts,
  user,
}: {
  counts: { orders?: number; ideas?: number };
  user?: { email: string; name: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fermer le tiroir quand la route change.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Barre latérale — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 bg-night-2 lg:flex">
        <div className="px-4 pb-6 pt-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <NavList pathname={pathname} counts={counts} />
        </div>
        <div className="border-t border-white/10 px-4 py-3">
          {user && (
            <div className="mb-1 flex items-center gap-2 px-3 py-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-flame/15 text-[11px] font-bold uppercase text-flame">
                {(user.name ?? user.email).charAt(0)}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-ivory-dim" title={user.email}>
                {user.name ?? user.email}
              </span>
            </div>
          )}
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ivory-dim transition-colors hover:bg-white/[0.05] hover:text-ivory"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 6l-6 6 6 6" />
            </svg>
            Retour à la boutique
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ivory-dim transition-colors hover:bg-white/[0.05] hover:text-ivory"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Barre supérieure — mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-night-2/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="rounded-lg border border-white/15 p-2 text-ivory transition-colors hover:bg-white/[0.05]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Tiroir — mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-night/70 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-night-2">
            <div className="flex items-center justify-between px-4 pb-5 pt-5">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-lg border border-white/15 p-2 text-ivory transition-colors hover:bg-white/[0.05]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <NavList pathname={pathname} counts={counts} onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-white/10 px-4 py-3">
              <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ivory-dim hover:text-ivory">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 6l-6 6 6 6" />
                </svg>
                Retour à la boutique
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
