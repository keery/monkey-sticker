import { notFound } from "next/navigation";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  notice?: string;
};

type LegalPage = {
  title: string;
  introduction: string;
  sections: LegalSection[];
};

// Bloc `legal` du dictionnaire : les pages (indexées par slug) plus les chaînes
// partagées affichées autour de l'article.
type LegalDict = {
  kicker: string;
  lastUpdated: string;
  disclaimer: string;
  [slug: string]: LegalPage | string;
};

// Liste des slugs statiques exposés par `generateStaticParams`. `retours` et
// `politique-de-retour` partagent le même contenu (dupliqué dans le dictionnaire).
// Pages à relire par un professionnel du droit avant leur mise en ligne.
const LEGAL_SLUGS = [
  "livraison",
  "retours",
  "politique-de-retour",
  "mentions-legales",
  "confidentialite",
  "cgv",
] as const;

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export default async function StaticPage(props: PageProps<"/[lang]/pages/[slug]">) {
  const { lang, slug } = await props.params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  // `dict.legal` a des clés fixes connues dans le type : on l'indexe par le slug
  // dynamique via un cast vers Record<string, LegalPage>.
  const legal = dict.legal as unknown as LegalDict;
  const pages = legal as Record<string, LegalPage>;
  const page = pages[slug];
  if (!page || typeof page !== "object") notFound();

  return (
    <div className="bg-night text-ivory">
      <article className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
        <header className="border-b border-white/15 pb-8 sm:pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ivory-dim">{legal.kicker}</p>
          <h1 className="mt-4 font-display text-3xl uppercase text-ivory sm:text-4xl">{page.title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ivory-dim">{page.introduction}</p>
          <p className="mt-4 text-xs text-ivory-dim/70">{legal.lastUpdated}</p>
        </header>

        <div className="mt-10 space-y-10">
          {page.sections.map((section) => (
            <section key={section.title} className="scroll-mt-24">
              <h2 className="font-display text-xl uppercase text-ivory sm:text-2xl">{section.title}</h2>
              {section.paragraphs && (
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-ivory-dim">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              )}
              {section.bullets && (
                <ul className="mt-4 space-y-2 border-l border-white/20 pl-4 text-sm leading-relaxed text-ivory-dim">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {section.notice && (
                <p className="mt-5 border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
                  {section.notice}
                </p>
              )}
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-white/15 pt-6 text-xs leading-relaxed text-ivory-dim/70">
          {legal.disclaimer}
        </p>
      </article>
    </div>
  );
}
