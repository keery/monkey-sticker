// Tuile catégorie de la boutique : illustration (photo ou mosaïque des designs)
// surmontée du titre et du nombre de designs, cliquable vers la collection.

import Link from "next/link";
import { categoryMosaic, type Category, type Product } from "@/lib/products";
import { CategoryVisual } from "./CategoryVisual";

export function CategoryCard({
  category,
  products,
}: {
  category: Category;
  products: Product[];
}) {
  const count = products.filter((p) => p.kind === "sticker").length;
  const mosaic = categoryMosaic(category, products);
  return (
    <Link href={`/collections/${category.handle}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-night-2">
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
          <CategoryVisual image={category.image} title={category.title} products={mosaic} />
        </div>
        {/* voile bas pour asseoir le texte */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-night via-night/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
          <h3 className="font-display uppercase text-xl sm:text-2xl leading-none text-ivory">
            {category.title}
          </h3>
          <span className="shrink-0 text-xs text-ivory-dim">
            {count} design{count > 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
