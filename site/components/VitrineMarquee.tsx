// Vitrine défilante : les designs glissent lentement, chacun sous son halo,
// comme des enseignes lumineuses dans une rue la nuit. Pause au survol ;
// la copie dupliquée (nécessaire à la boucle) est inerte pour l'accessibilité.

import Link from "next/link";
import type { CSSProperties } from "react";
import type { Product } from "@/lib/products";
import { CardVisual } from "./CardVisual";

function Row({ products, hidden = false }: { products: Product[]; hidden?: boolean }) {
  return (
    <div className="inline-flex items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {products.map((p) => {
        const [c1, c2] = p.theme.colors;
        return (
          <Link
            key={p.handle}
            href={`/products/${p.handle}`}
            tabIndex={hidden ? -1 : undefined}
            className="glow-tile glow-on block w-44 sm:w-56 shrink-0 transition-transform duration-500 ease-out hover:scale-[1.06]"
            style={{ "--g1": `${c1}b3`, "--g2": `${c2}b3` } as CSSProperties}
          >
            <CardVisual image={p.image} theme={p.theme} seed={p.handle} transform={p.imageTransform} background={p.imageBackground} className="w-full" />
            <span className="sr-only">{p.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function VitrineMarquee({ products }: { products: Product[] }) {
  return (
    <div className="overflow-hidden fade-x-mask marquee-pause py-8">
      <div
        className="animate-marquee inline-flex whitespace-nowrap"
        style={{ "--marquee-duration": "55s" } as CSSProperties}
      >
        <Row products={products} />
        <Row products={products} hidden />
      </div>
    </div>
  );
}
