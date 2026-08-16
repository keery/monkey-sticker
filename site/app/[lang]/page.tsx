import type { CSSProperties } from "react";
import { SITE } from "@/lib/site";
import { getCatalogCached, getCategoryProductsCached } from "@/lib/catalog";
import { isLocale, DEFAULT_LOCALE, LOCALE_INTL } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { interpolate } from "@/lib/i18n/interpolate";
import { LocaleLink } from "@/components/LocaleLink";
import type { Dictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";
import { VitrineTile } from "@/components/VitrineTile";
import { CategoryCard } from "@/components/CategoryCard";
import { VitrineMarquee } from "@/components/VitrineMarquee";
import { HeroVitrine } from "@/components/HeroVitrine";
import { Reveal } from "@/components/Reveal";
import { PrecisionSchematic } from "@/components/PrecisionSchematic";
import { Stars } from "@/components/Stars";
import { Accordion } from "@/components/Accordion";
import { StatsMarquee } from "@/components/StatsMarquee";
import { NewsletterForm } from "@/components/NewsletterForm";

function SectionHead({
  overline,
  title,
  href,
  linkLabel,
}: {
  overline: string;
  title: string;
  href?: string;
  linkLabel: string;
}) {
  return (
    <Reveal className="mb-10 flex items-end justify-between gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ivory-dim">{overline}</p>
        <h2 className="mt-2 font-display uppercase text-3xl sm:text-5xl text-ivory">{title}</h2>
      </div>
      {href && (
        <LocaleLink
          href={href}
          className="shrink-0 text-sm font-semibold text-ivory-dim hover:text-ivory transition-colors"
        >
          {linkLabel} →
        </LocaleLink>
      )}
    </Reveal>
  );
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const STEPS: Dictionary["home"]["install"]["steps"] = dict.home.install.steps;
  const FAQ = dict.home.faq.items.map((it) => ({ title: it.title, content: it.content }));

  const bestsellers = await getCategoryProductsCached("bestsellers");
  const justDropped = await getCategoryProductsCached("just-dropped");
  const all = await getCategoryProductsCached("all");
  const vitrine = all.filter((p) => p.kind === "sticker").slice(0, 14);

  // Cartes de la vitrine du hero : bestsellers d'abord, puis le reste, sans
  // doublon. On privilégie les designs avec une vraie image (cartes déjà
  // customisées) ; à défaut (base fraîche), CardVisual retombe sur le thème.
  const seenHero = new Set<string>();
  const heroStickers = [...bestsellers, ...all].filter(
    (p) => p.kind === "sticker" && !seenHero.has(p.handle) && seenHero.add(p.handle),
  );
  const withArt = heroStickers.filter((p) => p.image);
  const heroPool = withArt.length >= 6 ? withArt : heroStickers;
  const heroFocal = heroPool[0];
  const heroVideoCard = heroPool[1] ?? heroPool[0];
  const heroWall = heroPool.slice(2, 6);

  // Catégories mises en avant : celles qui ont une photo ou au moins un design.
  const { categories } = await getCatalogCached();
  const featuredCategories = categories
    .map((c) => ({ category: c, products: all.filter((p) => p.collections.includes(c.handle)) }))
    .filter(({ category, products }) => category.image || products.some((p) => p.kind === "sticker"));

  return (
    <div className="bg-night text-ivory">
      {/* HERO — la vitrine de nuit */}
      <section className="relative overflow-hidden">
        {/* éclairage de vitrine : un halo chaud en haut, une lueur en bas à droite */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-40 left-1/2 h-[55vh] w-[80vw] -translate-x-1/2 rounded-full opacity-[0.13] blur-3xl"
            style={{ background: "radial-gradient(closest-side, oklch(0.85 0.06 75), transparent)" }}
          />
          <div
            className="absolute bottom-0 right-0 h-[40vh] w-[45vw] translate-x-1/4 translate-y-1/3 rounded-full opacity-[0.16] blur-3xl"
            style={{ background: "radial-gradient(closest-side, oklch(0.6 0.17 20), transparent)" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
          <div>
            <Reveal load>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ivory-dim">
                {dict.home.hero.overline}
              </p>
            </Reveal>
            <Reveal bare load className="mt-4">
              <h1 className="font-display uppercase leading-[0.92] text-ivory text-[clamp(3.4rem,7vw,6rem)]">
                <span className="block overflow-hidden pb-[0.08em]">
                  <span className="line-reveal-inner">{dict.home.hero.titleLine1}</span>
                </span>
                <span className="block overflow-hidden pb-[0.08em]">
                  <span
                    className="line-reveal-inner"
                    style={{ "--reveal-delay": "130ms" } as CSSProperties}
                  >
                    {dict.home.hero.titleLine2}
                  </span>
                </span>
              </h1>
            </Reveal>
            <Reveal load delay={220}>
              <p className="mt-6 text-lg text-ivory-dim max-w-md">
                {dict.home.hero.subtitle}
              </p>
            </Reveal>
            <Reveal load delay={300}>
              <div className="mt-8 flex flex-wrap gap-3">
                <LocaleLink
                  href="/create-own"
                  className="rounded-full bg-flame text-night px-7 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep active:scale-[0.97] transition-[background-color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
                >
                  {dict.nav.createOwn}
                </LocaleLink>
                <LocaleLink
                  href="/collections/all"
                  className="rounded-full border border-white/25 text-ivory px-7 py-3.5 text-sm font-bold uppercase tracking-wide hover:border-ivory hover:bg-white/5 active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 ease-out"
                >
                  {dict.common.viewDesigns}
                </LocaleLink>
              </div>
            </Reveal>
            <Reveal load delay={360}>
              <div className="mt-7 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ivory-dim">
                <Stars value={SITE.rating.value} tone="dark" />
                <span className="font-semibold text-ivory">
                  {SITE.rating.value.toLocaleString(LOCALE_INTL[locale])}/5
                </span>
                <span>
                  ·{" "}
                  {interpolate(dict.home.hero.reviews, {
                    count: SITE.rating.count.toLocaleString(LOCALE_INTL[locale]),
                  })}
                </span>
                <span aria-hidden className="text-ivory-dim/40">·</span>
                <span className="font-semibold text-ivory">{dict.home.hero.bogo}</span>
              </div>
            </Reveal>
          </div>

          {/* La pièce maîtresse : vitrine vivante de vraies cartes + slot vidéo.
              Dépose l'URL du MP4 dans videoSrc quand la pose sera filmée. */}
          {heroFocal && (
            <HeroVitrine focal={heroFocal} wall={heroWall} videoCard={heroVideoCard} />
          )}
        </div>
      </section>

      {/* LA VITRINE — les designs défilent comme des enseignes la nuit */}
      <section className="border-y border-white/5">
        <Reveal>
          <VitrineMarquee products={vitrine} />
        </Reveal>
      </section>

      {/* BESTSELLERS */}
      {bestsellers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <SectionHead
            overline={dict.home.sections.bestsellers.overline}
            title={dict.home.sections.bestsellers.title}
            href="/collections/bestsellers"
            linkLabel={dict.common.seeAll}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
            {bestsellers.slice(0, 8).map((p, i) => (
              <Reveal key={p.handle} delay={(i % 4) * 90}>
                <VitrineTile product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* EXPLORER PAR CATÉGORIE */}
      {featuredCategories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <SectionHead
            overline={dict.home.sections.categories.overline}
            title={dict.home.sections.categories.title}
            href="/collections/all"
            linkLabel={dict.home.sections.categories.linkLabel}
          />
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCategories.map(({ category, products }, i) => (
              <Reveal key={category.handle} delay={(i % 3) * 90}>
                <CategoryCard category={category} products={products} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* PRÉCISION — l'artisanat comme preuve */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:py-28">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
          <Reveal>
            <PrecisionSchematic className="w-full" />
          </Reveal>
          <div>
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ivory-dim">
                {dict.home.precision.overline}
              </p>
              <h2 className="mt-2 font-display uppercase text-3xl sm:text-5xl text-ivory leading-[1.02]">
                {dict.home.precision.title}
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-5 text-ivory-dim max-w-md">
                {dict.home.precision.body}
              </p>
            </Reveal>
            <Reveal delay={280}>
              <ul className="mt-8 space-y-4 text-sm">
                {dict.home.precision.features.map((f) => (
                  <li key={f.title} className="flex items-baseline gap-3">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-flame" />
                    <span>
                      <span className="font-semibold text-ivory">{f.title}</span>
                      <span className="text-ivory-dim"> : {f.desc}.</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* LA POSE + FAQ */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:py-28">
          <SectionHead
            overline={dict.home.install.overline}
            title={dict.home.install.title}
            linkLabel={dict.common.seeAll}
          />
          <div className="grid sm:grid-cols-3 gap-10">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 130}>
                <p className="font-display text-5xl text-flame">{s.n}</p>
                <p className="mt-3 text-lg font-semibold text-ivory">{s.title}</p>
                <p className="mt-1.5 text-sm text-ivory-dim leading-relaxed">{s.text}</p>
              </Reveal>
            ))}
          </div>

          <div className="mt-24 grid lg:grid-cols-[1fr_1.5fr] gap-10">
            <Reveal>
              <h2 className="font-display uppercase text-2xl sm:text-3xl text-ivory leading-tight">
                {dict.home.faq.heading}
              </h2>
              <p className="mt-3 text-sm text-ivory-dim">
                {dict.home.faq.moreLead}{" "}
                <LocaleLink href="/pages/faq" className="underline underline-offset-4 hover:text-ivory">
                  {dict.home.faq.moreLink}
                </LocaleLink>{" "}
                {dict.home.faq.moreTail}
              </p>
            </Reveal>
            <Reveal delay={150}>
              <Accordion items={FAQ} tone="dark" firstOpen />
            </Reveal>
          </div>
        </div>
      </section>

      {/* NOUVEAUTÉS */}
      {justDropped.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <SectionHead
            overline={dict.home.sections.justDropped.overline}
            title={dict.nav.justDropped}
            href="/collections/just-dropped"
            linkLabel={dict.common.seeAll}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
            {justDropped.slice(0, 4).map((p, i) => (
              <Reveal key={p.handle} delay={i * 90}>
                <VitrineTile product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* L'OFFRE — dite une fois, en grand */}
      <section className="bg-flame text-night">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:py-28 grid lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <Reveal bare>
            <h2 className="font-display uppercase leading-[0.95] text-[clamp(2.8rem,7vw,5.5rem)]">
              <span className="block overflow-hidden pb-[0.08em]">
                <span className="line-reveal-inner">{dict.home.offer.titleLine1}</span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <span
                  className="line-reveal-inner"
                  style={{ "--reveal-delay": "120ms" } as CSSProperties}
                >
                  {dict.home.offer.titleLine2}
                </span>
              </span>
            </h2>
          </Reveal>
          <Reveal delay={250}>
            <p className="text-lg font-medium max-w-sm">
              {dict.home.offer.body}
            </p>
            <LocaleLink
              href="/collections/all"
              className="mt-7 inline-block rounded-full bg-night text-ivory px-7 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-night-2 active:scale-[0.97] transition-[background-color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-night"
            >
              {dict.home.offer.cta}
            </LocaleLink>
          </Reveal>
        </div>
      </section>

      {/* RÉASSURANCE — les preuves au moment de décider d'acheter */}
      <Reveal>
        <StatsMarquee />
      </Reveal>

      {/* ACCÈS ANTICIPÉ */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-0 h-64 w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
            style={{ background: "radial-gradient(closest-side, oklch(0.85 0.06 75), transparent)" }}
          />
        </div>
        <div className="relative mx-auto max-w-2xl px-4 py-24 sm:py-28 text-center">
          <Reveal>
            <h2 className="font-display uppercase text-3xl sm:text-4xl text-ivory">
              {dict.home.earlyAccess.title}
            </h2>
            <p className="mt-3 text-ivory-dim">
              {dict.home.earlyAccess.body}
            </p>
          </Reveal>
          <Reveal delay={140}>
            <NewsletterForm dark source="home" />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
