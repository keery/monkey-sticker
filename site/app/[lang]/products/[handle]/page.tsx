import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getCategoryProductsCached, getProductByHandleCached } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedProduct } from "@/lib/i18n/catalog";
import { interpolate, plural } from "@/lib/i18n/interpolate";
import { LocaleLink } from "@/components/LocaleLink";
import { CardVisual } from "@/components/CardVisual";
import { ChipSelectionProvider, LiveCardVisual } from "@/components/ChipSelection";
import { Stars } from "@/components/Stars";
import { Accordion } from "@/components/Accordion";
import { VitrineTile } from "@/components/VitrineTile";
import { ProductPurchase } from "@/components/ProductPurchase";
import { StatsMarquee } from "@/components/StatsMarquee";
import { Tilt3DCard } from "@/components/Tilt3DCard";
import { Reveal } from "@/components/Reveal";

export const dynamic = "force-dynamic";

export default async function ProductPage(props: PageProps<"/[lang]/products/[handle]">) {
  const { lang, handle } = await props.params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  const product = await getProductByHandleCached(handle);
  if (!product || product.kind === "custom") notFound();

  const loc = localizedProduct(product, locale);

  const recos = (await getCategoryProductsCached("all"))
    .filter((p) => p.handle !== product.handle && p.kind === "sticker")
    .slice(0, 4);

  const [c1, c2] = product.theme.colors;

  const accordions = [
    {
      title: dict.productPage.accDescriptionTitle,
      content:
        loc.description ??
        interpolate(dict.productPage.accDescriptionFallback, { name: loc.name }),
    },
    {
      title: dict.productPage.accApplicationTitle,
      content: dict.productPage.accApplicationContent,
    },
    {
      title: dict.productPage.accShippingTitle,
      content: dict.productPage.accShippingContent,
    },
  ];

  return (
    <div className="bg-night text-ivory">
      <div className="relative overflow-hidden">
        {/* éclairage de vitrine : un halo chaud au-dessus de la pièce exposée */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-32 left-[22%] h-[50vh] w-[55vw] -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
            style={{ background: "radial-gradient(closest-side, oklch(0.85 0.06 75), transparent)" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-8 pb-16 lg:pb-20">
          <nav className="text-xs text-ivory-dim mb-8">
            <LocaleLink href="/" className="hover:text-ivory transition-colors">{dict.productPage.breadcrumbHome}</LocaleLink> /{" "}
            <LocaleLink href="/collections/all" className="hover:text-ivory transition-colors">{dict.productPage.breadcrumbStickers}</LocaleLink>{" "}
            / <span className="text-ivory">{loc.name}</span>
          </nav>

          <ChipSelectionProvider>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* La pièce exposée : carte 3D sous les projecteurs, deux vues en retrait */}
            <div className="lg:sticky lg:top-24">
              <Reveal className="px-4 sm:px-10 pt-8 pb-4">
                <Tilt3DCard glow={[c1, c2]} className="-rotate-2">
                  <LiveCardVisual
                    image={product.image}
                    theme={product.theme}
                    seed={product.handle}
                    transform={product.imageTransform}
                    background={product.imageBackground}
                    className="w-full drop-shadow-2xl"
                  />
                </Tilt3DCard>
              </Reveal>
              <div className="mt-10 grid grid-cols-2 gap-8 px-2 sm:px-6">
                <Reveal delay={140}>
                  <div
                    className="glow-tile glow-on"
                    style={{ "--g1": `${c1}59`, "--g2": `${c2}59` } as CSSProperties}
                  >
                    <CardVisual
                      image={product.image}
                      theme={product.theme}
                      seed={`${product.handle}-alt`}
                      transform={product.imageTransform}
                      background={product.imageBackground}
                      showChip={false}
                      className="w-full rotate-3 opacity-90"
                    />
                  </div>
                  <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-ivory-dim">
                    {dict.productPage.viewNoWindow}
                  </p>
                </Reveal>
                <Reveal delay={240}>
                  <div
                    className="glow-tile glow-on"
                    style={{ "--g1": `${c2}59`, "--g2": `${c1}59` } as CSSProperties}
                  >
                    <LiveCardVisual
                      image={product.image}
                      theme={product.theme}
                      seed={product.handle}
                      transform={product.imageTransform}
                      background={product.imageBackground}
                      className="w-full -rotate-6 drop-shadow-2xl"
                    />
                  </div>
                  <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-ivory-dim">
                    {dict.productPage.viewOnCard}
                  </p>
                </Reveal>
              </div>
            </div>

            {/* Infos + achat */}
            <div>
              {loc.badge && (
                <span className="inline-block bg-ivory text-night text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 mb-4">
                  {loc.badge}
                </span>
              )}
              <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.95] text-ivory">
                {loc.name}
              </h1>
              <div className="mt-3 flex items-center gap-2 text-sm text-ivory-dim">
                <Stars value={product.rating} tone="dark" />
                <span className="font-semibold text-ivory">{product.rating.toFixed(1)}</span>
                <span>· {plural(locale, product.reviewCount, dict.productPage.reviewCount, { count: product.reviewCount })}</span>
              </div>
              <p className="mt-5 text-2xl font-bold text-ivory">
                {formatPrice(product.price, locale)}
                {product.compareAtPrice && (
                  <span className="ml-2 text-base text-ivory-dim line-through font-normal">
                    {formatPrice(product.compareAtPrice, locale)}
                  </span>
                )}
              </p>

              <div className="mt-7">
                <ProductPurchase product={product} />
              </div>

              <div className="mt-10">
                <Accordion items={accordions} tone="dark" firstOpen />
              </div>
            </div>
          </div>
          </ChipSelectionProvider>
        </div>
      </div>

      {/* Réassurance */}
      <StatsMarquee />

      {/* Avis */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <Reveal className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ivory-dim">{dict.productPage.reviewsEyebrow}</p>
          <h2 className="mt-2 font-display uppercase text-3xl sm:text-5xl text-ivory">{dict.productPage.reviewsTitle}</h2>
        </Reveal>
        <div className="grid lg:grid-cols-[240px_1fr] gap-10 mb-10">
          <Reveal>
            <p className="font-display text-6xl text-ivory">{product.rating.toFixed(1)}</p>
            <Stars value={product.rating} tone="dark" className="mt-2" />
            <p className="mt-1.5 text-sm text-ivory-dim">{plural(locale, product.reviewCount, dict.productPage.verifiedReviewCount, { count: product.reviewCount })}</p>
          </Reveal>
          <Reveal delay={120} className="space-y-2 max-w-md">
            {([
              [5, 82],
              [4, 12],
              [3, 4],
              [2, 1],
              [1, 1],
            ] as const).map(([stars, pct]) => (
              <div key={stars} className="flex items-center gap-3 text-xs text-ivory-dim">
                <span className="w-6">{stars}★</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-ivory" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums">{pct} %</span>
              </div>
            ))}
          </Reveal>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {dict.productPage.reviews.map((r, i) => (
            <Reveal key={r.name} delay={i * 110}>
              <figure className="h-full rounded-2xl border border-white/10 bg-night-2/60 p-6">
                <Stars value={r.rating} tone="dark" />
                <blockquote className="mt-4 text-sm text-ivory leading-relaxed">« {r.text} »</blockquote>
                <figcaption className="mt-4 text-xs font-semibold text-ivory-dim">
                  {interpolate(dict.productPage.reviewByline, { name: r.name })}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Recos */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <Reveal className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ivory-dim">{dict.productPage.recosEyebrow}</p>
            <h2 className="mt-2 font-display uppercase text-3xl sm:text-5xl text-ivory">{dict.productPage.recosTitle}</h2>
          </div>
          <LocaleLink
            href="/collections/all"
            className="shrink-0 text-sm font-semibold text-ivory-dim hover:text-ivory transition-colors"
          >
            {dict.productPage.recosSeeAll}
          </LocaleLink>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
          {recos.map((p, i) => (
            <Reveal key={p.handle} delay={(i % 4) * 90}>
              <VitrineTile product={p} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
