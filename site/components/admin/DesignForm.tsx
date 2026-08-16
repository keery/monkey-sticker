"use client";

// Formulaire création/édition d'un design. Flux image-first : on téléverse une
// image, on la cadre sur la carte (éditeur intégré), puis titre / prix /
// catégorie / description. Plus de choix de motif ni de couleurs : la palette
// (fond derrière l'image, halo de vitrine) est dérivée automatiquement de
// l'image et envoyée en champs cachés — la validation serveur reste inchangée.

import { useActionState, useEffect, useState } from "react";
import {
  createDesignAction,
  updateDesignAction,
  type ActionState,
} from "@/lib/admin-actions";
import type { Category, ImageTransform, Product, Theme } from "@/lib/products";
import { ArtworkPositioner } from "@/components/admin/ArtworkPositioner";
import { IDENTITY_TRANSFORM } from "@/lib/card-art";
import { field, btnPrimary, TRANSLATION_LOCALES } from "@/lib/admin-ui";

interface Palette {
  colors: [string, string];
  dark: boolean;
}

const DEFAULT_PALETTE: Palette = { colors: ["#8a94a6", "#454b58"], dark: true };

// Fond de carte par défaut : blanc.
const DEFAULT_BG = "#ffffff";

/** Couleur dominante (moyenne) de l'image + variante assombrie, pour le fond et
 * le halo de vitrine. same-origin (/designs) ou data-URL → canvas non « tainted »
 * (getImageData autorisé). Renvoie null en cas d'échec (repli sur la valeur en
 * cours). */
function extractPalette(src: string): Promise<Palette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const N = 24;
        const c = document.createElement("canvas");
        c.width = N;
        c.height = N;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, N, N);
        const { data } = ctx.getImageData(0, 0, N, N);
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 8) continue; // ignore les pixels transparents
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
        if (!n) return resolve(null);
        r = Math.round(r / n);
        g = Math.round(g / n);
        b = Math.round(b / n);
        const hex = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
        const toHex = (rr: number, gg: number, bb: number) => `#${hex(rr)}${hex(gg)}${hex(bb)}`;
        const d = 0.62; // variante assombrie
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        resolve({
          colors: [toHex(r, g, b), toHex(r * d, g * d, b * d)],
          dark: lum < 0.5,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

/** Prépare une image avant l'envoi à la Server Action : les rasters trop grands
 * sont redimensionnés (≤ maxDim px sur le plus grand côté) et ré-encodés en WebP
 * (compact, transparence préservée). Évite la limite de taille de la Server
 * Action et garde le storefront léger. Les SVG (vecteur) passent tels quels.
 * Renvoie le fichier (éventuellement réduit) + son data-URL d'aperçu. */
async function prepareUpload(file: File, maxDim = 2000): Promise<{ file: File; dataUrl: string }> {
  if (file.type === "image/svg+xml") return { file, dataUrl: await readDataUrl(file) };

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("image illisible"));
      i.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    // déjà petite (dimensions + octets) → on garde l'original tel quel
    if (scale === 1 && file.size <= 1_500_000) return { file, dataUrl: await readDataUrl(file) };

    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, dataUrl: await readDataUrl(file) };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, cw, ch);

    const blob =
      (await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.9))) ??
      (await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png")));
    if (!blob) return { file, dataUrl: await readDataUrl(file) };

    const ext = blob.type === "image/png" ? "png" : "webp";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    const prepared = new File([blob], `${base}.${ext}`, { type: blob.type || "image/webp" });
    return { file: prepared, dataUrl: await readDataUrl(blob) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface DesignFormInitial {
  name?: string;
  theme?: Theme;
  description?: string;
  proposalId?: string;
  image?: string;
}

export function DesignForm({
  categories,
  design,
  initial,
}: {
  categories: Category[];
  design?: Product;
  initial?: DesignFormInitial;
}) {
  const action = design
    ? updateDesignAction.bind(null, design.handle)
    : createDesignAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  const seedTheme = design?.theme ?? initial?.theme;

  // image réelle : artwork existant (studio/édition) et/ou upload local
  const [image, setImage] = useState<string | undefined>(design?.image ?? initial?.image);
  const [uploadPreview, setUploadPreview] = useState<string | undefined>(undefined);
  const shownImage = uploadPreview ?? image;

  // cadrage non destructif de l'artwork sur la carte (éditeur intégré). Repart
  // de l'identité (cover) dès qu'une nouvelle image est chargée.
  const [transform, setTransform] = useState<ImageTransform>(
    design?.imageTransform ?? IDENTITY_TRANSFORM,
  );

  // palette dérivée de l'image (halo de vitrine). Seed depuis le thème existant
  // si édition ; sinon défaut, puis extraction à chaque image affichée.
  const [palette, setPalette] = useState<Palette>(
    seedTheme
      ? { colors: [seedTheme.colors[0], seedTheme.colors[1] ?? DEFAULT_PALETTE.colors[1]], dark: seedTheme.dark ?? false }
      : DEFAULT_PALETTE,
  );

  // couleur de fond de la carte, derrière l'image (visible là où l'image ne
  // couvre pas : zoom arrière, rotation, cadrage décentré). Par défaut BLANC,
  // choisissable librement.
  const [background, setBackground] = useState<string>(design?.imageBackground ?? DEFAULT_BG);

  // extraction de la palette (halo de vitrine uniquement) à chaque image affichée.
  useEffect(() => {
    if (!shownImage) return;
    let cancelled = false;
    extractPalette(shownImage).then((p) => {
      if (!cancelled && p) setPalette(p);
    });
    return () => {
      cancelled = true;
    };
  }, [shownImage]);

  // traductions : langue de base = français (champs racine) ; ce bloc porte les
  // autres langues. Un seul onglet visible à la fois, mais tous les champs
  // restent montés (name=i18n.<code>.name…) pour être soumis d'un coup.
  const [showTranslations, setShowTranslations] = useState(false);
  const [transLocale, setTransLocale] = useState(TRANSLATION_LOCALES[0].code);

  // Motif conservé pour ne pas altérer un design légacy sans image édité ; sans
  // incidence dès qu'une image est présente (elle prime sur le motif partout).
  const basePattern = seedTheme?.pattern ?? "gradient";
  const previewTheme: Theme = { pattern: basePattern, colors: palette.colors, dark: palette.dark };

  return (
    <form action={formAction} className="grid items-start gap-8 lg:grid-cols-2">
      {/* Aperçu live / éditeur de cadrage */}
      <div className="lg:sticky lg:top-8">
        <div className="rounded-2xl border border-white/10 bg-night-2 p-8">
          {shownImage ? (
            <ArtworkPositioner
              image={shownImage}
              theme={previewTheme}
              value={transform}
              onChange={setTransform}
              background={background}
            />
          ) : (
            <div className="flex aspect-[856/540] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-center text-ivory-dim">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15l-5-5L5 21" />
                <path d="M12 3v9m0 0l3.5-3.5M12 12L8.5 8.5" />
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              <p className="text-sm font-semibold text-ivory">Téléverse une image</p>
              <p className="text-xs">Tu pourras la cadrer sur la carte juste ici.</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-ivory-dim">
          {shownImage
            ? "Ce cadrage est exactement ce qui sera affiché et imprimé."
            : "L'image devient le visuel du produit, cadré aux cotes réelles de la carte."}
        </p>
      </div>

      {/* Champs */}
      <div className="space-y-5">
        {initial?.proposalId && !design && (
          <input type="hidden" name="proposalId" value={initial.proposalId} />
        )}
        {/* palette dérivée de l'image (fond + halo) — pas de saisie manuelle */}
        <input type="hidden" name="pattern" value={basePattern} />
        <input type="hidden" name="color1" value={palette.colors[0]} />
        <input type="hidden" name="color2" value={palette.colors[1]} />
        <input type="hidden" name="dark" value={palette.dark ? "on" : ""} />

        {state.error && (
          <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {state.error}
          </p>
        )}

        {/* Image du design — visuel principal */}
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-sm font-semibold text-ivory">Image du design *</p>
          <input type="hidden" name="image" value={image ?? ""} />
          <input type="hidden" name="imageTransform" value={JSON.stringify(transform)} />
          <input type="hidden" name="imageBackground" value={background} />
          <input
            type="file"
            name="imageFile"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const inputEl = e.currentTarget;
              const f = inputEl.files?.[0];
              if (!f) {
                setUploadPreview(undefined);
                return;
              }
              // nouvelle image → cadrage neutre (cover)
              setTransform(IDENTITY_TRANSFORM);
              prepareUpload(f)
                .then(({ file, dataUrl }) => {
                  // remplace le fichier de l'input par la version réduite : c'est
                  // elle qui partira dans la Server Action au submit.
                  if (file !== f) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    inputEl.files = dt.files;
                  }
                  setUploadPreview(dataUrl);
                })
                .catch(() => {
                  // échec de préparation → on garde l'original et son aperçu
                  const r = new FileReader();
                  r.onload = () => setUploadPreview(r.result as string);
                  r.readAsDataURL(f);
                });
            }}
            className="block w-full text-xs text-ivory-dim file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-flame file:px-4 file:py-2 file:text-xs file:font-semibold file:text-night"
          />
          <p className="text-xs text-ivory-dim">
            PNG, JPG, WebP ou SVG.
            {image && !uploadPreview && (
              <>
                {" "}Actuel : <code className="font-mono text-ivory">{image}</code>{" "}
                <button
                  type="button"
                  onClick={() => {
                    setImage(undefined);
                    setTransform(IDENTITY_TRANSFORM);
                  }}
                  className="text-rose-300 underline"
                >
                  retirer
                </button>
              </>
            )}
          </p>

          {/* Couleur de fond de la carte, derrière l'image (blanc par défaut) */}
          <div className="flex items-center gap-3 border-t border-white/10 pt-3">
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              aria-label="Couleur de fond de la carte"
              className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent"
            />
            <div className="text-xs text-ivory-dim">
              <span className="font-semibold text-ivory">Couleur de fond de la carte</span>
              <br />
              visible là où l&apos;image ne couvre pas (zoom arrière, rotation, cadrage décentré).
              {background.toLowerCase() !== DEFAULT_BG && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => setBackground(DEFAULT_BG)}
                    className="text-flame underline hover:text-flame-deep"
                  >
                    réinitialiser (blanc)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold text-ivory">Nom *</span>
            <input name="name" required defaultValue={design?.name ?? initial?.name} placeholder="Ex. Vague Émeraude" className={`${field} mt-1.5`} />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-ivory">Identifiant (handle)</span>
            <input name="handle" defaultValue={design?.handle} placeholder="auto depuis le nom" className={`${field} mt-1.5 font-mono text-xs`} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold text-ivory">Prix (€) *</span>
            <input name="price" required inputMode="decimal" defaultValue={design?.price ?? 7.99} className={`${field} mt-1.5`} />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-ivory">Badge</span>
            <input name="badge" defaultValue={design?.badge} placeholder="Ex. Nouveau, Édition limitée…" className={`${field} mt-1.5`} />
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ivory">Catégories</p>
          {categories.length === 0 ? (
            <p className="text-xs text-ivory-dim">Aucune catégorie : crée-les dans l&apos;onglet Catégories.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <label
                  key={c.handle}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-white/12 px-4 py-1.5 text-xs font-semibold text-ivory-dim transition-colors hover:border-white/30 hover:text-ivory has-checked:border-flame has-checked:bg-flame/[0.12] has-checked:text-ivory"
                >
                  <input type="checkbox" name="categories" value={c.handle} defaultChecked={design?.collections.includes(c.handle)} className="h-3.5 w-3.5 accent-flame" />
                  {c.title}
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="block text-sm">
          <span className="font-semibold text-ivory">Description</span>
          <textarea name="description" rows={3} defaultValue={design?.description ?? initial?.description} placeholder="Optionnel : sinon un texte générique est utilisé sur la fiche." className={`${field} mt-1.5 resize-y`} />
        </label>

        {/* Traductions — français = langue de base ci-dessus ; ici les autres langues. */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setShowTranslations((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
          >
            <span className="text-sm font-semibold text-ivory">
              Traductions
              <span className="ml-2 text-xs font-normal text-ivory-dim">
                autres langues — le français reste la base
              </span>
            </span>
            <span className="text-xs text-ivory-dim">{showTranslations ? "Masquer ▲" : "Modifier ▼"}</span>
          </button>

          {showTranslations && (
            <div className="border-t border-white/10 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {TRANSLATION_LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setTransLocale(l.code)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                      transLocale === l.code
                        ? "border-flame bg-flame text-night"
                        : "border-white/12 text-ivory-dim hover:border-white/30 hover:text-ivory"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* Tous les champs restent montés (un seul visible) pour être soumis ensemble. */}
              {TRANSLATION_LOCALES.map((l) => (
                <div key={l.code} className={transLocale === l.code ? "mt-4 space-y-4" : "hidden"}>
                  <label className="block text-sm">
                    <span className="font-semibold text-ivory">Nom ({l.label})</span>
                    <input
                      name={`i18n.${l.code}.name`}
                      defaultValue={design?.i18n?.[l.code]?.name ?? ""}
                      placeholder="Vide = repli sur le français"
                      className={`${field} mt-1.5`}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-ivory">Description ({l.label})</span>
                    <textarea
                      name={`i18n.${l.code}.description`}
                      rows={3}
                      defaultValue={design?.i18n?.[l.code]?.description ?? ""}
                      placeholder="Vide = repli sur le français"
                      className={`${field} mt-1.5 resize-y`}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3.5`}>
          {pending ? "Enregistrement…" : design ? "Enregistrer les modifications" : "Créer le design"}
        </button>
      </div>
    </form>
  );
}
