"use client";

// Éditeur de variantes de COULEUR d'un design (admin, français uniquement).
// Chaque couleur a sa propre image ; le cadrage sur la carte est PARTAGÉ (celui
// de l'éditeur principal ci-dessus). La couleur #0 est la couleur principale :
// son image est l'image principale du design (pas de nouvel upload ici).
//
// Sortie vers la Server Action (create/updateDesignAction) :
//  · champ caché `variantsJson` = [{ name, swatch, imageBackground?, image? }, …]
//    (émis seulement s'il y a ≥ 2 couleurs → choix obligatoire à l'achat) ;
//  · un <input type="file" name="variantImageFile.<i>"> par couleur additionnelle.

import { useRef, useState } from "react";
import type { ImageTransform, ProductVariant, Theme } from "@/lib/products";
import { CardVisual } from "@/components/CardVisual";
import { prepareUpload } from "@/lib/image-upload";
import { field, btnGhostSm, btnDangerSm } from "@/lib/admin-ui";

interface ColorRow {
  id: string;
  name: string;
  swatch: string; // hex
  image?: string; // chemin /designs existant (édition) — couleurs additionnelles
  preview?: string; // data-URL d'un nouvel upload (couleurs additionnelles)
  background?: string; // fond de carte propre à la couleur ("" = hérite du produit)
}

const DEFAULT_SWATCH = "#000000";

export function VariantsEditor({
  initial,
  primaryImage,
  primaryBackground,
  transform,
  previewTheme,
}: {
  initial?: ProductVariant[];
  primaryImage?: string;
  primaryBackground: string;
  transform: ImageTransform;
  previewTheme: Theme;
}) {
  const seeded = Boolean(initial && initial.length >= 2);
  // Compteur d'ID stable : démarre après les lignes initiales (qui prennent
  // c0…c{n-1} par index ci-dessous) pour éviter toute collision avec les
  // couleurs ajoutées ensuite. `nextId` n'est appelé que dans des gestionnaires
  // d'événement (enable/addColor), jamais pendant le rendu.
  const idSeq = useRef(seeded ? initial!.length : 0);
  const nextId = () => `c${idSeq.current++}`;

  const [enabled, setEnabled] = useState(seeded);
  const [rows, setRows] = useState<ColorRow[]>(() =>
    seeded
      ? initial!.map((v, i) => ({
          id: `c${i}`,
          name: v.name,
          swatch: v.swatch ?? (i === 0 ? previewTheme.colors[0] : DEFAULT_SWATCH),
          image: i === 0 ? undefined : v.image,
          background: v.imageBackground ?? "",
        }))
      : [],
  );

  function enable() {
    setEnabled(true);
    if (rows.length < 2) {
      setRows([
        { id: nextId(), name: "", swatch: previewTheme.colors[0] ?? DEFAULT_SWATCH },
        { id: nextId(), name: "", swatch: DEFAULT_SWATCH },
      ]);
    }
  }

  function disable() {
    setEnabled(false);
    setRows([]);
  }

  function addColor() {
    setRows((r) => [...r, { id: nextId(), name: "", swatch: DEFAULT_SWATCH }]);
  }

  function removeColor(id: string) {
    setRows((r) => r.filter((row) => row.id !== id));
  }

  function patch(id: string, next: Partial<ColorRow>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...next } : row)));
  }

  async function onPickImage(id: string, inputEl: HTMLInputElement) {
    const f = inputEl.files?.[0];
    if (!f) {
      patch(id, { preview: undefined });
      return;
    }
    try {
      const { file, dataUrl } = await prepareUpload(f);
      if (file !== f) {
        const dt = new DataTransfer();
        dt.items.add(file);
        inputEl.files = dt.files;
      }
      patch(id, { preview: dataUrl });
    } catch {
      const r = new FileReader();
      r.onload = () => patch(id, { preview: r.result as string });
      r.readAsDataURL(f);
    }
  }

  // Métadonnées transmises : la couleur principale (index 0) n'embarque ni image
  // ni fond (le serveur reprend l'image/fond principaux) ; les autres portent le
  // chemin existant (édition sans re-upload) et un fond éventuel.
  const metas = rows.map((r, i) =>
    i === 0
      ? { name: r.name.trim(), swatch: r.swatch }
      : {
          name: r.name.trim(),
          swatch: r.swatch,
          imageBackground: r.background || undefined,
          image: r.image || undefined,
        },
  );
  const active = enabled && rows.length >= 2;

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      {/* Émis seulement si ≥ 2 couleurs : sinon aucune variante (pas de choix imposé). */}
      {active && <input type="hidden" name="variantsJson" value={JSON.stringify(metas)} />}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ivory">Variantes de couleur</p>
          <p className="mt-0.5 text-xs text-ivory-dim">
            Plusieurs couleurs de la même carte — chacune avec sa propre image. Le client
            devra choisir une couleur. Le cadrage ci-dessus est partagé par toutes les couleurs.
          </p>
        </div>
        {!enabled ? (
          <button type="button" onClick={enable} className={`${btnGhostSm} shrink-0`}>
            + Ajouter des couleurs
          </button>
        ) : (
          <button type="button" onClick={disable} className={`${btnDangerSm} shrink-0`}>
            Désactiver
          </button>
        )}
      </div>

      {enabled && (
        <>
          {!primaryImage && (
            <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              Ajoute d&apos;abord l&apos;image principale ci-dessus : c&apos;est la première couleur.
            </p>
          )}

          <div className="space-y-3">
            {rows.map((row, i) => {
              const primary = i === 0;
              const shown = primary ? primaryImage : row.preview ?? row.image;
              const bg = (primary ? primaryBackground : row.background) || primaryBackground;
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3"
                >
                  {/* Aperçu de la carte dans cette couleur (cadrage partagé) */}
                  <div className="w-24 shrink-0 overflow-hidden rounded-md border border-white/15 bg-night">
                    {shown ? (
                      <CardVisual
                        image={shown}
                        theme={previewTheme}
                        seed={`variant-${row.id}`}
                        transform={transform}
                        background={bg}
                        showChip={false}
                        className="w-full"
                      />
                    ) : (
                      <div className="aspect-[856/540] w-full bg-white/5" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2" style={{ minWidth: "12rem" }}>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Pastille de couleur"
                        value={row.swatch}
                        onChange={(e) => patch(row.id, { swatch: e.target.value })}
                        className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                      />
                      <input
                        value={row.name}
                        onChange={(e) => patch(row.id, { name: e.target.value })}
                        placeholder={primary ? "Nom (ex. Noir) — couleur principale" : "Nom (ex. Rouge)"}
                        className={`${field} flex-1`}
                      />
                      {!primary && (
                        <button
                          type="button"
                          onClick={() => removeColor(row.id)}
                          className={btnDangerSm}
                        >
                          Retirer
                        </button>
                      )}
                    </div>

                    {primary ? (
                      <p className="text-xs text-ivory-dim">
                        Image = l&apos;image principale ci-dessus. Fond = celui du design.
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          name={`variantImageFile.${i}`}
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={(e) => onPickImage(row.id, e.currentTarget)}
                          className="block max-w-full text-xs text-ivory-dim file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-flame file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-night"
                        />
                        <label className="flex items-center gap-2 text-xs text-ivory-dim">
                          <input
                            type="color"
                            aria-label="Fond de carte de cette couleur"
                            value={row.background || primaryBackground}
                            onChange={(e) => patch(row.id, { background: e.target.value })}
                            className="h-7 w-9 cursor-pointer rounded-md border border-white/15 bg-transparent"
                          />
                          fond
                        </label>
                        {row.image && !row.preview && (
                          <code className="font-mono text-[11px] text-ivory-dim">{row.image}</code>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={addColor} className={btnGhostSm}>
            + Ajouter une couleur
          </button>
        </>
      )}
    </div>
  );
}
