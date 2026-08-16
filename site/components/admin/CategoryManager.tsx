"use client";

// Gestion des catégories : création, renommage inline, illustration (photo
// téléversée ou mosaïque de designs choisis / par défaut), suppression.

import { useActionState, useState } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
  updateCategoryImageAction,
  updateCategoryMosaicAction,
  type ActionState,
} from "@/lib/admin-actions";
import { categoryMosaic, type Category, type Product } from "@/lib/products";
import { CategoryVisual } from "@/components/CategoryVisual";
import { CardVisual } from "@/components/CardVisual";
import {
  field,
  btnPrimary,
  btnGhostSm,
  btnDangerSm,
  chip,
  TRANSLATION_LOCALES,
} from "@/lib/admin-ui";

function CategoryIllustration({
  category,
  mosaic,
}: {
  category: Category;
  mosaic: Product[];
}) {
  const [imgState, imgAction, imgPending] = useActionState<ActionState, FormData>(
    updateCategoryImageAction.bind(null, category.handle),
    {},
  );

  return (
    <div className="w-full sm:w-40 shrink-0">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-night-2">
        <CategoryVisual image={category.image} title={category.title} products={mosaic} />
        {imgPending && (
          <div className="absolute inset-0 grid place-items-center bg-night/60 text-[11px] font-semibold text-ivory">
            Envoi…
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <form action={imgAction} className="min-w-0 flex-1">
          <label className={`${btnGhostSm} w-full cursor-pointer`}>
            {category.image ? "Changer" : "Ajouter une photo"}
            <input
              type="file"
              name="imageFile"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                if (e.currentTarget.files?.length) e.currentTarget.form?.requestSubmit();
              }}
            />
          </label>
        </form>
        {category.image && (
          <form action={imgAction}>
            <input type="hidden" name="remove" value="1" />
            <button type="submit" disabled={imgPending} className={btnDangerSm}>
              Retirer
            </button>
          </form>
        )}
      </div>
      {imgState.error && <p className="mt-1 text-xs text-rose-300">{imgState.error}</p>}
      {!category.image && (
        <p className="mt-1 text-[11px] text-ivory-dim/70">Repli : mosaïque de designs.</p>
      )}
    </div>
  );
}

function MosaicPicker({
  category,
  designs,
}: {
  category: Category;
  designs: Product[];
}) {
  const [state, mosaicAction, pending] = useActionState<ActionState, FormData>(
    updateCategoryMosaicAction.bind(null, category.handle),
    {},
  );
  const [open, setOpen] = useState(false);

  const valid = new Set(designs.map((d) => d.handle));
  const [selected, setSelected] = useState<string[]>(
    (category.mosaic ?? []).filter((h) => valid.has(h)).slice(0, 4),
  );

  function toggle(handle: string) {
    setSelected((prev) =>
      prev.includes(handle)
        ? prev.filter((h) => h !== handle)
        : prev.length >= 4
          ? prev
          : [...prev, handle],
    );
  }

  const auto = selected.length === 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-ivory">
          Designs de la mosaïque
          <span className="ml-2 text-xs font-normal text-ivory-dim">
            {auto ? "auto — 4 premiers" : `${selected.length}/4 choisi${selected.length > 1 ? "s" : ""}`}
          </span>
        </span>
        <span className="text-xs text-ivory-dim">{open ? "Masquer ▲" : "Choisir ▼"}</span>
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 py-3">
          {designs.length === 0 ? (
            <p className="text-xs text-ivory-dim">Aucun design dans cette catégorie pour l&apos;instant.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-ivory-dim">
                Choisis jusqu&apos;à 4 designs, dans l&apos;ordre d&apos;affichage. Sinon, les 4 premiers sont utilisés.
              </p>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                {designs.map((p) => {
                  const idx = selected.indexOf(p.handle);
                  const on = idx >= 0;
                  const full = !on && selected.length >= 4;
                  return (
                    <button
                      key={p.handle}
                      type="button"
                      onClick={() => toggle(p.handle)}
                      disabled={full}
                      title={full ? "Maximum 4 designs" : p.name}
                      className={`relative rounded-lg border p-1.5 text-left transition-colors ${
                        on
                          ? "border-flame bg-flame/[0.12]"
                          : full
                            ? "border-white/[0.06] opacity-40"
                            : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      {on && (
                        <span className="absolute right-1 top-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-flame text-[11px] font-bold text-night">
                          {idx + 1}
                        </span>
                      )}
                      <CardVisual
                        image={p.image}
                        theme={p.theme}
                        seed={p.handle}
                        showChip={false}
                        className="w-full"
                      />
                      <span className="mt-1 block truncate text-[11px] text-ivory-dim">{p.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={mosaicAction}>
                  {selected.map((h) => (
                    <input key={h} type="hidden" name="mosaic" value={h} />
                  ))}
                  <button type="submit" disabled={pending} className={btnPrimary}>
                    {pending ? "Enregistrement…" : "Enregistrer la sélection"}
                  </button>
                </form>
                {selected.length > 0 && (
                  <button type="button" onClick={() => setSelected([])} className={btnGhostSm}>
                    Vider (revenir en auto)
                  </button>
                )}
              </div>
              {state.error && <p className="mt-2 text-xs text-rose-300">{state.error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Titres traduits d'une catégorie. Le français reste le champ « title »
 * ci-dessus ; ces champs (`i18n.<code>.title`) sont soumis dans le même
 * formulaire « Renommer », donc enregistrés d'un même clic. */
function CategoryTranslations({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState(TRANSLATION_LOCALES[0].code);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-semibold text-ivory-dim transition-colors hover:text-ivory"
      >
        Traductions {open ? "▲" : "▼"}
        <span className="ml-1.5 font-normal text-ivory-dim/70">
          autres langues — le français reste la base
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {TRANSLATION_LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLocale(l.code)}
                className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors ${
                  locale === l.code
                    ? "border-flame bg-flame text-night"
                    : "border-white/12 text-ivory-dim hover:border-white/30 hover:text-ivory"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          {/* Tous montés (un seul visible) pour être soumis avec « Renommer ». */}
          {TRANSLATION_LOCALES.map((l) => (
            <label key={l.code} className={locale === l.code ? "mt-3 block text-sm" : "hidden"}>
              <span className="font-semibold text-ivory">Titre ({l.label})</span>
              <input
                name={`i18n.${l.code}.title`}
                defaultValue={category.i18n?.[l.code]?.title ?? ""}
                placeholder="Vide = repli sur le français"
                className={`${field} mt-1.5`}
              />
            </label>
          ))}
          <p className="mt-2 text-[11px] text-ivory-dim/70">
            Enregistré avec le bouton « Renommer ».
          </p>
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  designCount,
  designs,
}: {
  category: Category;
  designCount: number;
  designs: Product[];
}) {
  const [renameState, renameAction, renaming] = useActionState<ActionState, FormData>(
    renameCategoryAction.bind(null, category.handle),
    {},
  );
  const [deleteState, deleteFormAction, deleting] = useActionState<ActionState, FormData>(
    async (_prev: ActionState) => deleteCategoryAction(category.handle),
    {},
  );

  const mosaic = categoryMosaic(category, designs);

  return (
    <li className="flex flex-col gap-4 px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CategoryIllustration category={category} mosaic={mosaic} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-3">
            <form action={renameAction} className="min-w-52 flex-1">
              <div className="flex items-center gap-2">
                <input name="title" defaultValue={category.title} className={field} />
                <button type="submit" disabled={renaming} className={btnGhostSm}>
                  Renommer
                </button>
              </div>
              <CategoryTranslations category={category} />
            </form>
            <span className="text-xs tabular-nums text-ivory-dim">
              {designCount} design{designCount > 1 ? "s" : ""}
            </span>
            <span className="font-mono text-[10px] text-ivory-dim/60">/{category.handle}</span>
            {category.core ? (
              <span className={chip}>Cœur · accueil</span>
            ) : (
              <form
                action={deleteFormAction}
                onSubmit={(e) => {
                  if (
                    !confirm(
                      `Supprimer la catégorie « ${category.title} » ? Les ${designCount} design(s) ne seront pas supprimés, juste retirés de la catégorie.`,
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <button type="submit" disabled={deleting} className={btnDangerSm}>
                  Supprimer
                </button>
              </form>
            )}
          </div>
          {(renameState.error || deleteState.error) && (
            <p className="mt-2 text-xs text-rose-300">{renameState.error ?? deleteState.error}</p>
          )}
        </div>
      </div>

      {!category.image && <MosaicPicker category={category} designs={designs} />}
    </li>
  );
}

export function CategoryManager({
  categories,
  designCounts,
  designs,
}: {
  categories: Category[];
  designCounts: Record<string, number>;
  designs: Record<string, Product[]>;
}) {
  const [createState, createAction, creating] = useActionState<ActionState, FormData>(
    createCategoryAction,
    {},
  );

  return (
    <div>
      <form action={createAction} className="mb-2 flex items-center gap-2">
        <input name="title" required placeholder="Nouvelle catégorie (ex. Été 2026)" className={field} />
        <button type="submit" disabled={creating} className={btnPrimary}>
          Créer
        </button>
      </form>
      {createState.error && <p className="mb-2 text-xs text-rose-300">{createState.error}</p>}

      <ul className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        {categories.map((c) => (
          <CategoryRow
            key={c.handle}
            category={c}
            designCount={designCounts[c.handle] ?? 0}
            designs={designs[c.handle] ?? []}
          />
        ))}
      </ul>
    </div>
  );
}
