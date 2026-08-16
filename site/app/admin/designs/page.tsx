import { getCatalog } from "@/lib/catalog";
import { DesignsBrowser } from "@/components/admin/DesignsBrowser";
import { PageHeader } from "@/components/admin/AdminUI";

export const dynamic = "force-dynamic";

export default async function AdminDesignsPage() {
  const { products, categories } = await getCatalog();
  // getCatalog renvoie déjà les produits du plus récent au plus ancien (seq DESC).
  const stickers = products.filter((p) => p.kind === "sticker");

  return (
    <div>
      <PageHeader
        title="Designs"
        sub={`${stickers.length} design${stickers.length > 1 ? "s" : ""} répartis sur ${categories.length} catégorie${categories.length > 1 ? "s" : ""}.`}
      />
      <DesignsBrowser designs={stickers} categories={categories} />
    </div>
  );
}
