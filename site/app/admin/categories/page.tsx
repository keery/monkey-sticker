import { getCatalog } from "@/lib/catalog";
import type { Product } from "@/lib/products";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { PageHeader } from "@/components/admin/AdminUI";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const { categories, products } = await getCatalog();
  const designCounts: Record<string, number> = {};
  const designs: Record<string, Product[]> = {};
  for (const c of categories) {
    const inCat = products.filter((p) => p.collections.includes(c.handle));
    designCounts[c.handle] = inCat.length;
    designs[c.handle] = inCat.filter((p) => p.kind === "sticker");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Catégories"
        sub="Regroupe les designs, et illustre chaque catégorie d'une photo (ou choisis les designs de la mosaïque)."
      />
      <CategoryManager categories={categories} designCounts={designCounts} designs={designs} />
    </div>
  );
}
