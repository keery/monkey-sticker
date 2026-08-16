"use client";

// Catalogue de designs : grille visuelle plein cadre avec recherche instantanée
// et filtre par catégorie. On gère les designs à l'œil, donc on montre l'artwork.
// Sélection multiple : cocher plusieurs designs pour les supprimer d'un coup.

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import type { Category, Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { deleteDesignsAction } from "@/lib/admin-actions";
import { DesignThumb } from "@/components/admin/DesignThumb";
import { DeleteDesignButton } from "@/components/admin/DeleteDesignButton";
import { field, btnPrimary, btnGhostSm, chip } from "@/lib/admin-ui";

export function DesignsBrowser({
  designs,
  categories,
}: {
  designs: Product[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const titleOf = (handle: string) =>
    categories.find((c) => c.handle === handle)?.title ?? handle;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return designs.filter((p) => {
      const inCat = cat === "all" || p.collections.includes(cat);
      const inQuery =
        !q || p.name.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q);
      return inCat && inQuery;
    });
  }, [designs, query, cat]);

  const anySelected = selected.size > 0;
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.handle));

  function toggle(handle: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((p) => next.delete(p.handle));
      else filtered.forEach((p) => next.add(p.handle));
      return next;
    });
  }

  function bulkDelete() {
    const handles = [...selected];
    if (handles.length === 0) return;
    if (
      !confirm(
        `Supprimer ${handles.length} design${handles.length > 1 ? "s" : ""} ? Cette action est définitive.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteDesignsAction(handles);
      setSelected(new Set());
    });
  }

  return (
    <div>
      {/* Barre d'outils : recherche + nouveau design */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory-dim/60"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un design ou un handle…"
            className={`${field} pl-9`}
          />
        </div>
        <p className="text-sm tabular-nums text-ivory-dim">
          {filtered.length} / {designs.length}
        </p>
        <Link href="/admin/designs/new" className={btnPrimary}>
          + Nouveau design
        </Link>
      </div>

      {/* Filtre par catégorie */}
      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
            Toutes
          </FilterChip>
          {categories.map((c) => (
            <FilterChip key={c.handle} active={cat === c.handle} onClick={() => setCat(c.handle)}>
              {c.title}
            </FilterChip>
          ))}
        </div>
      )}

      {/* Barre de sélection multiple */}
      {anySelected && (
        <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-flame/30 bg-night-2/95 px-4 py-2.5 backdrop-blur">
          <span className="text-sm font-semibold text-ivory">
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
          </span>
          <button onClick={toggleSelectAll} className={btnGhostSm}>
            {allFilteredSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
          <button onClick={() => setSelected(new Set())} className={btnGhostSm}>
            Effacer
          </button>
          <button
            onClick={bulkDelete}
            disabled={pending}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:pointer-events-none disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
            </svg>
            {pending ? "Suppression…" : `Supprimer (${selected.size})`}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center text-sm text-ivory-dim">
          Aucun design ne correspond à ta recherche.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((p) => {
            const isSel = selected.has(p.handle);
            return (
              <li
                key={p.handle}
                className={`group flex flex-col overflow-hidden rounded-2xl border bg-white/[0.02] transition-colors ${
                  isSel
                    ? "border-flame/60 ring-1 ring-flame/40"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="relative bg-night-2 p-4">
                  <DesignThumb image={p.image} theme={p.theme} seed={p.handle} name={p.name} transform={p.imageTransform} background={p.imageBackground} className="w-full drop-shadow-lg" />
                  {p.badge && (
                    <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-flame px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-night">
                      {p.badge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(p.handle)}
                    aria-pressed={isSel}
                    aria-label={isSel ? `Désélectionner ${p.name}` : `Sélectionner ${p.name}`}
                    className={`absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition-all duration-150 ${
                      isSel
                        ? "border-flame bg-flame text-night"
                        : `border-white/50 bg-night/60 text-transparent backdrop-blur hover:border-white ${
                            anySelected ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          }`
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 6" />
                    </svg>
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ivory">{p.name}</p>
                    <p className="truncate font-mono text-[11px] text-ivory-dim/70">{p.handle}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-flame">
                    {formatPrice(p.price)}
                  </p>
                  {p.collections.filter((c) => c !== "all").length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.collections
                        .filter((c) => c !== "all")
                        .map((c) => (
                          <span key={c} className={chip}>
                            {titleOf(c)}
                          </span>
                        ))}
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-1.5 pt-2">
                    <Link href={`/admin/designs/${p.handle}`} className={`${btnGhostSm} flex-1 justify-center`}>
                      Modifier
                    </Link>
                    <Link
                      href={`/products/${p.handle}`}
                      target="_blank"
                      aria-label={`Voir ${p.name} sur la boutique`}
                      title="Voir sur la boutique"
                      className={btnGhostSm}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17L17 7M9 7h8v8" />
                      </svg>
                    </Link>
                    <DeleteDesignButton handle={p.handle} name={p.name} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-flame text-night"
          : "border border-white/12 text-ivory-dim hover:border-white/25 hover:text-ivory"
      }`}
    >
      {children}
    </button>
  );
}
