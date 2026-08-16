// Store catalogue côté serveur, adossé à Postgres (tables products & categories :
// clé handle + objet complet en JSONB, ordre préservé par la colonne seq).
// Auto-seed depuis lib/products.ts quand la base est vierge (premier démarrage
// / base managée provisionnée à vide). NE PAS importer depuis un composant client.

import { unstable_cache } from "next/cache";
import { pool, ensureSchema } from "./db";
import {
  CUSTOM_PRODUCT,
  PRODUCTS,
  SEED_CATEGORIES,
  type Category,
  type Product,
} from "./products";

export interface Catalog {
  categories: Category[];
  products: Product[];
}

// Crée le schéma puis, si les tables sont vides, injecte le seed (une fois par
// process). L'ordre d'insertion fixe la colonne seq → ordre d'affichage stable.
let ready: Promise<void> | null = null;
async function ensureCatalog(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureSchema();
      const { rows } = await pool.query(
        `SELECT (SELECT count(*) FROM products)   AS p,
                (SELECT count(*) FROM categories) AS c`,
      );
      if (Number(rows[0].p) === 0) {
        for (const product of PRODUCTS) {
          await pool.query(
            `INSERT INTO products (handle, data) VALUES ($1, $2)
               ON CONFLICT (handle) DO NOTHING`,
            [product.handle, product],
          );
        }
      }
      if (Number(rows[0].c) === 0) {
        for (const category of SEED_CATEGORIES) {
          await pool.query(
            `INSERT INTO categories (handle, data) VALUES ($1, $2)
               ON CONFLICT (handle) DO NOTHING`,
            [category.handle, category],
          );
        }
      }
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

export async function getCatalog(): Promise<Catalog> {
  await ensureCatalog();
  const [cats, prods] = await Promise.all([
    pool.query(`SELECT data FROM categories ORDER BY seq`),
    // Produits du plus récent au plus ancien : seq croît à l'insertion, donc
    // DESC place les derniers designs ajoutés en tête (admin + vitrine boutique).
    pool.query(`SELECT data FROM products ORDER BY seq DESC`),
  ]);
  return {
    categories: cats.rows.map((r) => r.data as Category),
    products: prods.rows.map((r) => r.data as Product),
  };
}

// --- Lectures storefront -------------------------------------------------

export async function getProductByHandle(handle: string): Promise<Product | undefined> {
  if (handle === CUSTOM_PRODUCT.handle) return CUSTOM_PRODUCT;
  await ensureCatalog();
  const { rows } = await pool.query(`SELECT data FROM products WHERE handle = $1`, [handle]);
  return rows[0] ? (rows[0].data as Product) : undefined;
}

export async function getCategoryProducts(handle: string): Promise<Product[]> {
  const { products } = await getCatalog();
  if (handle === "all") return products;
  return products.filter((p) => p.collections.includes(handle));
}

// --- Lecture storefront mise en cache ------------------------------------
// Les pages vitrine lisent le catalogue via ce cache : une seule requête
// Postgres est partagée entre toutes les visites, jusqu'à ce qu'une mutation
// admin appelle revalidateTag(CATALOG_TAG) — invalidation à chaud, donc le
// site reste juste. `revalidate` est un filet de sécurité (import hors-app,
// édition SQL directe). Le write-path admin garde getCatalog() (non caché)
// pour ses vérifications, afin de rester 100 % à jour.
export const CATALOG_TAG = "catalog";

export const getCatalogCached = unstable_cache(
  async (): Promise<Catalog> => getCatalog(),
  ["storefront-catalog"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

export async function getCategoryProductsCached(handle: string): Promise<Product[]> {
  const { products } = await getCatalogCached();
  if (handle === "all") return products;
  return products.filter((p) => p.collections.includes(handle));
}

export async function getCategoriesCached(): Promise<Category[]> {
  return (await getCatalogCached()).categories;
}

export async function getCategoryCached(handle: string): Promise<Category | undefined> {
  if (handle === "all") return { handle: "all", title: "Tous les stickers", core: true };
  return (await getCategoriesCached()).find((c) => c.handle === handle);
}

export async function getProductByHandleCached(handle: string): Promise<Product | undefined> {
  if (handle === CUSTOM_PRODUCT.handle) return CUSTOM_PRODUCT;
  // Lit dans le catalogue caché plutôt qu'une requête ciblée : tout le
  // storefront (accueil, rayons, fiches produit) partage un seul cache.
  return (await getCatalogCached()).products.find((p) => p.handle === handle);
}

export async function getCategories(): Promise<Category[]> {
  const { categories } = await getCatalog();
  return categories;
}

export async function getCategory(handle: string): Promise<Category | undefined> {
  if (handle === "all") return { handle: "all", title: "Tous les stickers", core: true };
  return (await getCategories()).find((c) => c.handle === handle);
}

// --- Mutations admin ------------------------------------------------------

export async function upsertDesign(product: Product, previousHandle?: string): Promise<void> {
  await ensureCatalog();
  if (previousHandle && previousHandle !== product.handle) {
    // renommage : on change la clé en conservant la position (seq)
    const { rowCount } = await pool.query(
      `UPDATE products SET handle = $1, data = $2 WHERE handle = $3`,
      [product.handle, product, previousHandle],
    );
    if (rowCount) return;
  }
  await pool.query(
    `INSERT INTO products (handle, data) VALUES ($1, $2)
       ON CONFLICT (handle) DO UPDATE SET data = EXCLUDED.data`,
    [product.handle, product],
  );
}

export async function deleteDesign(handle: string): Promise<void> {
  await ensureCatalog();
  await pool.query(`DELETE FROM products WHERE handle = $1`, [handle]);
}

export async function createCategory(category: Category): Promise<void> {
  await ensureCatalog();
  if (category.handle === "all") {
    throw new Error(`la catégorie « ${category.handle} » existe déjà`);
  }
  const { rowCount } = await pool.query(
    `INSERT INTO categories (handle, data) VALUES ($1, $2)
       ON CONFLICT (handle) DO NOTHING`,
    [category.handle, category],
  );
  if (!rowCount) throw new Error(`la catégorie « ${category.handle} » existe déjà`);
}

export async function renameCategory(handle: string, title: string): Promise<void> {
  await ensureCatalog();
  const { rowCount } = await pool.query(
    `UPDATE categories SET data = jsonb_set(data, '{title}', to_jsonb($2::text)) WHERE handle = $1`,
    [handle, title],
  );
  if (!rowCount) throw new Error(`catégorie introuvable : ${handle}`);
}

/** Enregistre (ou retire, si vide) les titres traduits d'une catégorie.
 * La langue de base (français) reste dans `title` — jamais touchée ici. */
export async function setCategoryI18n(
  handle: string,
  i18n: Category["i18n"] | undefined,
): Promise<void> {
  await ensureCatalog();
  const hasTranslations = i18n && Object.keys(i18n).length > 0;
  const { rowCount } = hasTranslations
    ? await pool.query(
        `UPDATE categories SET data = jsonb_set(data, '{i18n}', $2::jsonb) WHERE handle = $1`,
        [handle, JSON.stringify(i18n)],
      )
    : await pool.query(`UPDATE categories SET data = data - 'i18n' WHERE handle = $1`, [handle]);
  if (!rowCount) throw new Error(`catégorie introuvable : ${handle}`);
}

export async function setCategoryImage(handle: string, image: string | undefined): Promise<void> {
  await ensureCatalog();
  const { rowCount } = image
    ? await pool.query(
        `UPDATE categories SET data = jsonb_set(data, '{image}', to_jsonb($2::text)) WHERE handle = $1`,
        [handle, image],
      )
    : await pool.query(`UPDATE categories SET data = data - 'image' WHERE handle = $1`, [handle]);
  if (!rowCount) throw new Error(`catégorie introuvable : ${handle}`);
}

export async function setCategoryMosaic(handle: string, handles: string[]): Promise<void> {
  await ensureCatalog();
  const { products } = await getCatalog();
  // ne garde que des designs réellement dans la catégorie (max 4, ordre conservé)
  const inCat = new Set(
    products
      .filter((p) => p.kind === "sticker" && p.collections.includes(handle))
      .map((p) => p.handle),
  );
  const clean = handles.filter((h) => inCat.has(h)).slice(0, 4);
  const { rowCount } = clean.length
    ? await pool.query(
        `UPDATE categories SET data = jsonb_set(data, '{mosaic}', $2::jsonb) WHERE handle = $1`,
        [handle, JSON.stringify(clean)],
      )
    : await pool.query(`UPDATE categories SET data = data - 'mosaic' WHERE handle = $1`, [handle]);
  if (!rowCount) throw new Error(`catégorie introuvable : ${handle}`);
}

export async function deleteCategory(handle: string): Promise<void> {
  await ensureCatalog();
  const { rows } = await pool.query(`SELECT data FROM categories WHERE handle = $1`, [handle]);
  const cat = rows[0]?.data as Category | undefined;
  if (!cat) throw new Error(`catégorie introuvable : ${handle}`);
  if (cat.core) {
    throw new Error(`« ${cat.title} » est une catégorie cœur (utilisée par l'accueil), non supprimable`);
  }
  await pool.query(`DELETE FROM categories WHERE handle = $1`, [handle]);
  // retire la catégorie des designs qui l'utilisaient
  await pool.query(
    `UPDATE products
       SET data = jsonb_set(
         data, '{collections}',
         COALESCE(
           (SELECT jsonb_agg(c) FROM jsonb_array_elements_text(data->'collections') c WHERE c <> $1),
           '[]'::jsonb
         )
       )
       WHERE jsonb_exists(data->'collections', $1)`,
    [handle],
  );
}
