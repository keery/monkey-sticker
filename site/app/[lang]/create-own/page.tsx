import type { Metadata } from "next";
import { getCategoryProductsCached } from "@/lib/catalog";
import { CUSTOM_PRODUCT } from "@/lib/products";
import { CreateOwnCustomizer } from "@/components/CreateOwnCustomizer";
import { Reveal } from "@/components/Reveal";
import { Accordion } from "@/components/Accordion";
import { VitrineTile } from "@/components/VitrineTile";
import { Stars } from "@/components/Stars";
import { formatPrice } from "@/lib/format";
import { LocaleLink } from "@/components/LocaleLink";
import { isLocale, DEFAULT_LOCALE, LOCALE_INTL } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { interpolate } from "@/lib/i18n/interpolate";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/create-own">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return {
    title: dict.createOwn.meta.title,
    description: dict.createOwn.meta.description,
  };
}

export default async function CreateOwnPage({ params }: PageProps<"/[lang]/create-own">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const bestsellers = (await getCategoryProductsCached("bestsellers"))
    .filter((p) => p.kind === "sticker")
    .slice(0, 4);

  // Objections levées une par une : qualité, erreur de fichier, droits, puce.
  const FAQ = dict.createOwn.faq.items.map((it) => ({ title: it.title, content: it.content }));

  return (
    <div className="bg-night text-ivory">
      {/* L'ATELIER : l'outil est le héros, jamais sous la ligne de flottaison */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-40 left-1/2 h-[50vh] w-[75vw] -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
            style={{ background: "radial-gradient(closest-side, oklch(0.85 0.06 75), transparent)" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-20 lg:pt-14 lg:pb-24">
          <div className="max-w-2xl">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ivory-dim">
                {dict.createOwn.hero.overline}
              </p>
              <h1 className="mt-2 font-display uppercase text-4xl sm:text-6xl text-ivory leading-[0.95]">
                {dict.createOwn.hero.title}
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="mt-4 text-ivory-dim">
                {dict.createOwn.hero.subtitle}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ivory-dim">
                <span className="flex items-center gap-1.5">
                  <Stars value={CUSTOM_PRODUCT.rating} tone="dark" />
                  <span className="font-semibold text-ivory">
                    {CUSTOM_PRODUCT.rating.toLocaleString(LOCALE_INTL[locale])}
                  </span>
                  <span>· {interpolate(dict.createOwn.hero.reviews, { count: CUSTOM_PRODUCT.reviewCount })}</span>
                </span>
                <span aria-hidden>·</span>
                <span>
                  <span className="font-semibold text-ivory">{formatPrice(CUSTOM_PRODUCT.price, locale)}</span>{" "}
                  {dict.createOwn.hero.perSticker}
                </span>
              </div>
            </Reveal>
          </div>

          {/* Pas de Reveal ici : l'outil est disponible immédiatement */}
          <div className="mt-10">
            <CreateOwnCustomizer />
          </div>
        </div>
      </section>

      {/* LES QUESTIONS : lever les freins au moment où ils se posent */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-20 lg:py-24 grid lg:grid-cols-[1fr_1.5fr] gap-10">
          <Reveal>
            <h2 className="font-display uppercase text-2xl sm:text-3xl text-ivory leading-tight">
              {dict.createOwn.faq.title}
            </h2>
            <p className="mt-3 text-sm text-ivory-dim">
              {dict.createOwn.faq.moreLead}{" "}
              <LocaleLink href="/pages/faq" className="underline underline-offset-4 hover:text-ivory">
                {dict.createOwn.faq.moreLink}
              </LocaleLink>{" "}
              {dict.createOwn.faq.moreTail}
            </p>
          </Reveal>
          <Reveal delay={150}>
            <Accordion items={FAQ} tone="dark" firstOpen />
          </Reveal>
        </div>
      </section>

      {/* LA VITRINE DE SECOURS : personne ne repart les mains vides */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <Reveal className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ivory-dim">
              {dict.createOwn.showcase.overline}
            </p>
            <h2 className="mt-2 font-display uppercase text-3xl sm:text-5xl text-ivory">
              {dict.createOwn.showcase.title}
            </h2>
          </div>
          <LocaleLink
            href="/collections/all"
            className="shrink-0 text-sm font-semibold text-ivory-dim hover:text-ivory transition-colors"
          >
            {dict.createOwn.showcase.allLink}
          </LocaleLink>
        </Reveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
          {bestsellers.map((p, i) => (
            <Reveal key={p.handle} delay={i * 90}>
              <VitrineTile product={p} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
