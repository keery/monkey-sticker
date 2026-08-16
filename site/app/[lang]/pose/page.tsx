import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { Reveal } from "@/components/Reveal";
import { Accordion } from "@/components/Accordion";
import { LocaleLink } from "@/components/LocaleLink";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/pose">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return {
    title: `${dict.pose.metaTitle} | ${SITE.name}`,
    description: dict.pose.metaDescription,
  };
}

// Le modèle éprouvé du marché (Spigen, dbrand) : UNE vidéo courte + 3 étapes
// + une mini-FAQ — pas de guide interactif complexe.

export default async function PosePage({ params }: PageProps<"/[lang]/pose">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  return (
    <div className="bg-night text-ivory">
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-40 left-1/2 h-[50vh] w-[75vw] -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
            style={{ background: "radial-gradient(closest-side, oklch(0.85 0.06 75), transparent)" }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-20 lg:pt-20">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ivory-dim">
              {dict.pose.eyebrow}
            </p>
            <h1 className="mt-2 font-display uppercase text-4xl sm:text-6xl leading-[0.95]">
              {dict.pose.title}
            </h1>
            <p className="mt-4 text-ivory-dim max-w-xl">
              {dict.pose.intro.part1}<span className="text-ivory font-semibold">{dict.pose.intro.cradle}</span>{dict.pose.intro.part2}{" "}
              <span className="text-ivory font-semibold">{dict.pose.intro.spare}</span>{dict.pose.intro.part3}
            </p>
          </Reveal>

          {/* Emplacement vidéo — à remplacer par la vraie vidéo verticale 30 s */}
          <Reveal delay={160} className="mt-10">
            <div className="relative rounded-2xl border border-white/10 bg-night-2 aspect-video flex flex-col items-center justify-center gap-3">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-flame text-night">
                <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-0.5" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <p className="text-sm text-ivory-dim">
                {dict.pose.video.label} <span className="italic">{dict.pose.video.status}</span>
              </p>
            </div>
          </Reveal>

          {/* Les 3 gestes */}
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {dict.pose.steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <p className="font-display text-3xl text-flame">{s.n}</p>
                <p className="mt-2 font-semibold uppercase tracking-wide">{s.title}</p>
                <p className="mt-2 text-sm text-ivory-dim leading-relaxed">{s.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pas de panique */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-4 py-16 lg:py-20">
          <Reveal>
            <h2 className="font-display uppercase text-2xl sm:text-4xl">{dict.pose.panic.title}</h2>
            <p className="mt-2 text-sm text-ivory-dim">
              {dict.pose.panic.subtitle}
            </p>
          </Reveal>
          <Reveal delay={140} className="mt-8">
            <Accordion items={dict.pose.panic.items} tone="dark" firstOpen />
          </Reveal>
          <Reveal delay={220} className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-night-2 p-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-ivory-dim">
                {dict.pose.cta.text}{" "}
                <span className="text-ivory font-semibold">{dict.pose.cta.included}</span>
              </p>
              <LocaleLink
                href="/collections/all"
                className="rounded-full bg-flame text-night px-6 py-3 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors"
              >
                {dict.common.viewDesigns}
              </LocaleLink>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
