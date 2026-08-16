// Illustration d'une catégorie : une photo téléversée si elle existe, sinon
// une mosaïque des designs de la catégorie (repli automatique). Le parent
// fixe la taille, le ratio et l'arrondi ; ce composant remplit l'espace.

import type { Product } from "@/lib/products";
import { CardVisual } from "./CardVisual";

export function CategoryVisual({
  image,
  title,
  products,
}: {
  image?: string;
  title: string;
  products: Product[];
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />
    );
  }

  const sample = products.filter((p) => p.kind === "sticker").slice(0, 4);

  if (sample.length === 0) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-white/[0.06] to-transparent">
        <span className="font-display text-4xl uppercase text-ivory/25">
          {title.slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 grid content-center gap-2.5 p-4 ${
        sample.length === 1 ? "place-items-center" : "grid-cols-2"
      }`}
    >
      {sample.map((p) => (
        <CardVisual
          key={p.handle}
          image={p.image}
          theme={p.theme}
          seed={p.handle}
          className={`w-full drop-shadow-lg ${sample.length === 1 ? "max-w-[62%]" : ""}`}
        />
      ))}
    </div>
  );
}
