import { notFound } from "next/navigation";
import { getCategoriesCached, getCategoryCached, getCategoryProductsCached } from "@/lib/catalog";
import { categoryMosaic, sortProducts, type SortKey } from "@/lib/products";
import { VitrineTile } from "@/components/VitrineTile";
import { CategoryVisual } from "@/components/CategoryVisual";
import { Reveal } from "@/components/Reveal";
import { LocaleLink } from "@/components/LocaleLink";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { interpolate } from "@/lib/i18n/interpolate";
import { localizedCategory } from "@/lib/i18n/catalog";

export const dynamic = "force-dynamic";

const SORT_VALUES: SortKey[] = [
  "featured",
  "best-selling",
  "az",
  "za",
  "price-asc",
  "price-desc",
];

export default async function CollectionPage(
  props: PageProps<"/[lang]/collections/[handle]">,
) {
  const { lang, handle } = await props.params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  const sp = await props.searchParams;
  const category = await getCategoryCached(handle);
  if (!category) notFound();

  const categories = await getCategoriesCached();
  const sort = (typeof sp.tri === "string" ? sp.tri : "featured") as SortKey;
  const products = sortProducts(await getCategoryProductsCached(handle), sort);
  const categoryTitle = localizedCategory(category, locale).title;

  const sortOptions = SORT_VALUES.map((value) => ({
    value,
    label: dict.collection.sort[value],
  }));

  return (
    <div className="bg-night text-ivory">
      <div className="relative overflow-hidden">
        {/* éclairage de vitrine discret en haut de rayon */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-40 left-1/2 h-[40vh] w-[70vw] -translate-x-1/2 rounded-full opacity-[0.1] blur-3xl"
            style={{ background: "radial-gradient(closest-side, oklch(0.85 0.06 75), transparent)" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-8 pb-24">
          <nav className="text-xs text-ivory-dim mb-6">
            <LocaleLink href="/" className="hover:text-ivory transition-colors">{dict.collection.breadcrumbHome}</LocaleLink> /{" "}
            <span className="text-ivory">{categoryTitle}</span>
          </nav>

          {category.image && (
            <Reveal className="relative mb-8 aspect-[16/6] overflow-hidden rounded-3xl border border-white/10 bg-night-2">
              <CategoryVisual
                image={category.image}
                title={categoryTitle}
                products={categoryMosaic(category, products)}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/70 to-transparent" />
            </Reveal>
          )}

          <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ivory-dim">
                {dict.collection.eyebrow}
              </p>
              <h1 className="mt-2 font-display uppercase text-4xl sm:text-6xl text-ivory leading-[0.95]">
                {categoryTitle}
              </h1>
              <p className="mt-3 text-sm text-ivory-dim">
                {interpolate(
                  products.length > 1 ? dict.collection.countMany : dict.collection.countOne,
                  { count: products.length },
                )}
              </p>
            </Reveal>
            <form method="get" className="flex items-center gap-2 text-sm">
              <label htmlFor="tri" className="text-ivory-dim">{dict.collection.sortLabel}</label>
              <select
                id="tri"
                name="tri"
                defaultValue={sort}
                className="rounded-full border border-white/15 bg-night-2 text-ivory px-3 py-1.5 outline-none focus:border-white/40"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-ivory text-night px-4 py-1.5 font-semibold hover:bg-white transition-colors"
              >
                {dict.collection.sortSubmit}
              </button>
            </form>
          </div>

          {/* Chips catégories */}
          <div className="flex flex-wrap gap-2 mb-12">
            {[{ handle: "all", title: dict.collection.chipAll }, ...categories.map((c) => ({ handle: c.handle, title: localizedCategory(c, locale).title }))].map((c) => (
              <LocaleLink
                key={c.handle}
                href={`/collections/${c.handle}`}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                  c.handle === handle
                    ? "border-ivory bg-ivory text-night"
                    : "border-white/15 text-ivory hover:border-white/40"
                }`}
              >
                {c.title}
              </LocaleLink>
            ))}
          </div>

          {products.length === 0 ? (
            <p className="py-20 text-center text-ivory-dim text-sm">
              {dict.collection.empty}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
              {products.map((p, i) => (
                <Reveal key={p.handle} delay={(i % 4) * 90}>
                  <VitrineTile product={p} />
                </Reveal>
              ))}
            </div>
          )}

          <Reveal className="mt-20 flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-white/10 px-8 py-10">
            <div>
              <h2 className="font-display uppercase text-2xl sm:text-3xl text-ivory">
                {dict.collection.ctaTitle}
              </h2>
              <p className="mt-2 text-ivory-dim text-sm max-w-sm">
                {dict.collection.ctaText}
              </p>
            </div>
            <LocaleLink
              href="/create-own"
              className="rounded-full bg-flame text-night px-7 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors"
            >
              {dict.collection.ctaButton}
            </LocaleLink>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
