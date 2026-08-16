// Tuile produit de la home sombre : le halo, la carte, le nom / prix et les
// pastilles de variantes vivent dans <TileVisual> (client, pour l'aperçu live
// des couleurs). Ici on résout — côté serveur — la locale, le nom localisé et
// le prix formaté, passés en texte.

import { lang } from "next/root-params";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localizedProduct } from "@/lib/i18n/catalog";
import { TileVisual } from "./TileVisual";

export async function VitrineTile({ product }: { product: Product }) {
  const raw = await lang();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { name } = localizedProduct(product, locale);

  return (
    <TileVisual
      href={`/products/${product.handle}`}
      name={name}
      priceLabel={formatPrice(product.price, locale)}
      badge={product.badge}
      image={product.image}
      theme={product.theme}
      seed={product.handle}
      transform={product.imageTransform}
      background={product.imageBackground}
      variants={product.variants}
    />
  );
}
