// Tuile produit de la home sombre : la carte flotte sans cadre, son halo
// reprend les couleurs du design (comme une enseigne dans une vitrine).

import type { CSSProperties } from "react";
import { lang } from "next/root-params";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { localizedProduct } from "@/lib/i18n/catalog";
import { LocaleLink } from "./LocaleLink";
import { CardVisual } from "./CardVisual";

export async function VitrineTile({ product }: { product: Product }) {
  const raw = await lang();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { name } = localizedProduct(product, locale);
  const [c1, c2] = product.theme.colors;

  return (
    <LocaleLink href={`/products/${product.handle}`} className="group block">
      <div
        className="glow-tile"
        style={{ "--g1": `${c1}b3`, "--g2": `${c2}b3` } as CSSProperties}
      >
        {product.badge && (
          <span className="absolute top-2 left-2 z-10 bg-ivory text-night text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1">
            {product.badge}
          </span>
        )}
        <CardVisual
          image={product.image}
          theme={product.theme}
          seed={product.handle}
          transform={product.imageTransform}
          background={product.imageBackground}
          className="w-full transition-transform duration-500 ease-out group-hover:scale-[1.045] group-hover:-rotate-1"
        />
      </div>
      <div className="mt-3.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-ivory">{name}</p>
        <p className="text-sm font-semibold text-ivory whitespace-nowrap">
          {formatPrice(product.price, locale)}
        </p>
      </div>
    </LocaleLink>
  );
}
