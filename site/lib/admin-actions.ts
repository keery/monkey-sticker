"use server";

// Server Actions de l'espace admin — validation manuelle (zéro dépendance),
// écriture via lib/catalog.ts, revalidation de tout le site après mutation.

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  CATALOG_TAG,
  createCategory,
  deleteCategory,
  deleteDesign,
  getCatalog,
  renameCategory,
  setCategoryI18n,
  setCategoryImage,
  setCategoryMosaic,
  upsertDesign,
} from "./catalog";
import { setProposalStatus } from "./proposals";
import { requireAdmin } from "./auth";
import type { CategoryI18n, ImageTransform, PatternType, Product, ProductI18n, ProductVariant, Theme } from "./products";
import { isIdentityTransform, normalizeTransform } from "./card-art";
import { LOCALES, type Locale } from "./i18n/config";

// Langues traduisibles : toutes sauf le français, qui est la langue de base
// (champs racine). Les traductions vides ne sont pas stockées → repli propre.
const TRANSLATABLE: Locale[] = LOCALES.filter((l) => l !== "fr");

export interface ActionState {
  error?: string;
}

const PATTERNS: PatternType[] = [
  "gradient", "waves", "stripes", "dots", "rays", "floral", "grid", "camo",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function isHex(c: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(c);
}

/** Lit les traductions par langue depuis les champs `i18n.<code>.<field>`.
 * Les champs vides sont ignorés ; une langue sans aucun champ rempli est omise.
 * Renvoie `undefined` si aucune traduction n'est saisie (repli sur le français). */
function parseProductI18n(formData: FormData): Partial<Record<Locale, ProductI18n>> | undefined {
  const out: Partial<Record<Locale, ProductI18n>> = {};
  for (const code of TRANSLATABLE) {
    const name = String(formData.get(`i18n.${code}.name`) ?? "").trim();
    const description = String(formData.get(`i18n.${code}.description`) ?? "").trim();
    const entry: ProductI18n = {};
    if (name) entry.name = name;
    if (description) entry.description = description;
    if (Object.keys(entry).length) out[code] = entry;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Lit les titres traduits par langue depuis les champs `i18n.<code>.title`.
 * Champs vides ignorés ; `undefined` si aucune traduction (repli français). */
function parseCategoryI18n(formData: FormData): Partial<Record<Locale, CategoryI18n>> | undefined {
  const out: Partial<Record<Locale, CategoryI18n>> = {};
  for (const code of TRANSLATABLE) {
    const title = String(formData.get(`i18n.${code}.title`) ?? "").trim();
    if (title) out[code] = { title };
  }
  return Object.keys(out).length ? out : undefined;
}

function parseDesignForm(formData: FormData): { product: Omit<Product, "rating" | "reviewCount">; error?: string } | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Le nom est obligatoire." };

  const handle = slugify(String(formData.get("handle") ?? "") || name);
  if (!handle) return { error: "Impossible de dériver un identifiant (handle) du nom." };
  if (handle === "create-own" || handle === "all") return { error: `« ${handle} » est un identifiant réservé.` };

  const price = Number(String(formData.get("price") ?? "").replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) return { error: "Prix invalide." };

  const pattern = String(formData.get("pattern") ?? "") as PatternType;
  if (!PATTERNS.includes(pattern)) return { error: "Motif invalide." };

  const colors = ["color1", "color2", "color3"]
    .map((k) => String(formData.get(k) ?? "").trim())
    .filter(Boolean);
  if (colors.length < 2) return { error: "Au moins 2 couleurs sont requises." };
  if (!colors.every(isHex)) return { error: "Couleurs invalides (format attendu : #RRGGBB)." };

  const theme: Theme = {
    pattern,
    colors: colors as Theme["colors"],
    dark: formData.get("dark") === "on",
  };

  const badge = String(formData.get("badge") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const collections = formData.getAll("categories").map(String).filter(Boolean);
  const i18n = parseProductI18n(formData);

  // Cadrage de l'artwork (éditeur admin) : JSON normalisé, ignoré s'il est
  // neutre (cover). Ne sera conservé que si une image est réellement présente
  // (voir create/updateDesignAction) — inutile sur un design 100 % motif.
  const rawTransform = String(formData.get("imageTransform") ?? "").trim();
  let imageTransform: ImageTransform | undefined;
  if (rawTransform) {
    try {
      const t = normalizeTransform(JSON.parse(rawTransform));
      if (!isIdentityTransform(t)) imageTransform = t;
    } catch {
      // JSON invalide → on retombe sur le cover, sans erreur bloquante
    }
  }

  // Couleur de fond de la carte derrière l'image (choisie dans l'éditeur).
  // Ignorée si absente ou mal formée (repli sur la couleur du thème au rendu).
  const bgRaw = String(formData.get("imageBackground") ?? "").trim();
  const imageBackground = isHex(bgRaw) ? bgRaw : undefined;

  return {
    product: {
      handle,
      name,
      price,
      theme,
      collections: [...new Set(collections)].filter((c) => c !== "all"),
      badge: badge || undefined,
      kind: "sticker",
      description: description || undefined,
      i18n,
      imageTransform,
      imageBackground,
    },
  };
}

function revalidateAll() {
  revalidatePath("/", "layout");
  // Invalide le cache catalogue partagé par les pages vitrine (getCatalogCached).
  revalidateTag(CATALOG_TAG, "max");
}

const IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/** Écrit un fichier uploadé sous public/<subdir> et renvoie son chemin public. */
async function saveUpload(file: File, subdir: string, baseName: string): Promise<string> {
  const ext = IMAGE_EXT[file.type];
  if (!ext) throw new Error("Format d'image non supporté (PNG, JPG, WebP ou SVG).");
  const dir = path.join(process.cwd(), "public", subdir);
  await fs.mkdir(dir, { recursive: true });
  const name = `${baseName}.${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/${subdir}/${name}`;
}

function uploadedFile(formData: FormData, key: string): File | undefined {
  const file = formData.get(key);
  if (file && typeof file === "object" && "arrayBuffer" in file && (file as File).size > 0) {
    return file as File;
  }
  return undefined;
}

/** Upload prioritaire ; sinon chemin existant (artwork du studio) ; sinon rien. */
async function resolveImage(formData: FormData, handle: string): Promise<string | undefined> {
  const file = uploadedFile(formData, "imageFile");
  if (file) return saveUpload(file, "designs", `${handle}-upload`);
  const existing = String(formData.get("image") ?? "").trim();
  // seuls les chemins locaux sous /designs sont acceptés
  return existing.startsWith("/designs/") ? existing : undefined;
}

/** Métadonnées d'une couleur telles qu'envoyées par le formulaire (`variantsJson`).
 * L'image de la couleur principale (index 0) vient de l'éditeur principal ;
 * celle des autres couleurs d'un upload `variantImageFile.<i>` ou d'un chemin
 * /designs existant (édition sans re-upload). */
interface VariantMeta {
  name?: unknown;
  swatch?: unknown;
  imageBackground?: unknown;
  image?: unknown;
}

/** Construit les variantes de couleur du produit à partir du formulaire.
 * `primaryImage` = image de l'éditeur principal (couleur #0). Renvoie `undefined`
 * s'il n'y a pas de choix de couleur (< 2 couleurs). Lève une erreur lisible si
 * une couleur est incomplète (nom / image manquants, doublon). */
async function resolveVariants(
  formData: FormData,
  handle: string,
  primaryImage: string | undefined,
  primaryBackground: string | undefined,
): Promise<ProductVariant[] | undefined> {
  const raw = String(formData.get("variantsJson") ?? "").trim();
  if (!raw) return undefined;
  let metas: VariantMeta[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    metas = parsed as VariantMeta[];
  } catch {
    return undefined;
  }
  // Moins de 2 couleurs = pas de choix obligatoire → on ignore le bloc.
  if (metas.length < 2) return undefined;

  const variants: ProductVariant[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i];
    const name = String(m?.name ?? "").trim();
    if (!name) throw new Error(`Nom de couleur manquant (couleur ${i + 1}).`);
    const key = name.toLowerCase();
    if (seen.has(key)) throw new Error(`Couleur en double : « ${name} ».`);
    seen.add(key);

    const swatchRaw = String(m?.swatch ?? "").trim();
    const swatch = isHex(swatchRaw) ? swatchRaw : undefined;
    const bgRaw = String(m?.imageBackground ?? "").trim();
    let imageBackground = isHex(bgRaw) ? bgRaw : undefined;

    let image: string | undefined;
    if (i === 0) {
      // Couleur principale : image + fond de l'éditeur principal.
      image = primaryImage;
      if (imageBackground === undefined) imageBackground = primaryBackground;
    } else {
      const file = uploadedFile(formData, `variantImageFile.${i}`);
      if (file) image = await saveUpload(file, "designs", `${handle}-${slugify(name)}`);
      else {
        const existing = String(m?.image ?? "").trim();
        if (existing.startsWith("/designs/")) image = existing;
      }
    }
    if (!image) throw new Error(`Image manquante pour la couleur « ${name} ».`);
    variants.push({ name, swatch, image, imageBackground });
  }
  return variants;
}

export async function createDesignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseDesignForm(formData);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  const { product } = parsed as { product: Omit<Product, "rating" | "reviewCount"> };

  const { products } = await getCatalog();
  if (products.some((p) => p.handle === product.handle)) {
    return { error: `Un design avec l'identifiant « ${product.handle} » existe déjà.` };
  }
  let image: string | undefined;
  try {
    image = await resolveImage(formData, product.handle);
  } catch (e) {
    return { error: (e as Error).message };
  }
  // Flux image-first : un design se crée à partir d'une image téléversée.
  if (!image) return { error: "Une image est requise pour créer un design." };
  let variants: ProductVariant[] | undefined;
  try {
    variants = await resolveVariants(formData, product.handle, image, product.imageBackground);
  } catch (e) {
    return { error: (e as Error).message };
  }
  await upsertDesign({
    ...product,
    image, // = variants[0].image (couleur principale) le cas échéant
    imageTransform: image ? product.imageTransform : undefined,
    imageBackground: variants?.[0]?.imageBackground ?? (image ? product.imageBackground : undefined),
    variants,
    rating: 5,
    reviewCount: 0,
  });
  // si le design vient d'une proposition de la veille, marque-la traitée
  const proposalId = String(formData.get("proposalId") ?? "").trim();
  if (proposalId) {
    await setProposalStatus(proposalId, "created");
  }
  revalidateAll();
  redirect("/admin/designs");
}

export async function dismissProposalAction(id: string): Promise<void> {
  await requireAdmin();
  await setProposalStatus(id, "dismissed");
  revalidatePath("/admin/ideas");
}

export async function restoreProposalAction(id: string): Promise<void> {
  await requireAdmin();
  await setProposalStatus(id, "new");
  revalidatePath("/admin/ideas");
}

export async function updateDesignAction(previousHandle: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseDesignForm(formData);
  if ("error" in parsed && parsed.error) return { error: parsed.error };
  const { product } = parsed as { product: Omit<Product, "rating" | "reviewCount"> };

  const { products } = await getCatalog();
  const existing = products.find((p) => p.handle === previousHandle);
  if (!existing) return { error: `Design introuvable : ${previousHandle}` };
  if (product.handle !== previousHandle && products.some((p) => p.handle === product.handle)) {
    return { error: `Un design avec l'identifiant « ${product.handle} » existe déjà.` };
  }
  let image: string | undefined;
  try {
    image = await resolveImage(formData, product.handle);
  } catch (e) {
    return { error: (e as Error).message };
  }
  let variants: ProductVariant[] | undefined;
  try {
    variants = await resolveVariants(formData, product.handle, image, product.imageBackground);
  } catch (e) {
    return { error: (e as Error).message };
  }
  await upsertDesign(
    {
      ...product,
      image, // = variants[0].image (couleur principale) le cas échéant
      imageTransform: image ? product.imageTransform : undefined,
      imageBackground: variants?.[0]?.imageBackground ?? product.imageBackground,
      variants,
      rating: existing.rating,
      reviewCount: existing.reviewCount,
    },
    previousHandle,
  );
  revalidateAll();
  redirect("/admin/designs");
}

export async function deleteDesignAction(handle: string): Promise<void> {
  await requireAdmin();
  await deleteDesign(handle);
  revalidateAll();
}

/** Suppression groupée : plusieurs designs d'un coup (sélection multiple). */
export async function deleteDesignsAction(handles: string[]): Promise<void> {
  await requireAdmin();
  for (const handle of handles) {
    await deleteDesign(handle);
  }
  revalidateAll();
}

export async function createCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Le nom de la catégorie est obligatoire." };
  const handle = slugify(title);
  if (!handle) return { error: "Nom de catégorie invalide." };
  try {
    await createCategory({ handle, title });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidateAll();
  return {};
}

export async function renameCategoryAction(handle: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Le nom est obligatoire." };
  try {
    await renameCategory(handle, title);
    // titres traduits (autres langues) — le français reste la base ci-dessus
    await setCategoryI18n(handle, parseCategoryI18n(formData));
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidateAll();
  return {};
}

export async function deleteCategoryAction(handle: string): Promise<ActionState> {
  await requireAdmin();
  try {
    await deleteCategory(handle);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidateAll();
  return {};
}

/** Téléverse (ou retire, si `remove=1`) la photo d'illustration d'une catégorie. */
export async function updateCategoryImageAction(
  handle: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    if (formData.get("remove") === "1") {
      await setCategoryImage(handle, undefined);
    } else {
      const file = uploadedFile(formData, "imageFile");
      if (!file) return { error: "Aucune image sélectionnée." };
      const image = await saveUpload(file, "categories", `${handle}-${file.size}`);
      await setCategoryImage(handle, image);
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidateAll();
  return {};
}

/** Choisit les designs (max 4, ordonnés) affichés dans la mosaïque de repli
 * d'une catégorie. Sélection vide = retour au choix automatique. */
export async function updateCategoryMosaicAction(
  handle: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const picks = formData.getAll("mosaic").map(String).filter(Boolean);
  try {
    await setCategoryMosaic(handle, picks);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidateAll();
  return {};
}
