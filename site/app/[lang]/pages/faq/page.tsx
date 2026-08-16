import type { Metadata } from "next";
import { Accordion } from "@/components/Accordion";
import { ContactForm } from "@/components/ContactForm";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/pages/faq">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return {
    title: dict.footer.faqContact,
    description: dict.faq.metaDescription,
  };
}

export default async function FaqPage({ params }: PageProps<"/[lang]/pages/faq">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const faqItems = dict.faq.items.map((item) => ({
    title: item.q,
    content: item.a,
  }));

  return (
    <div className="bg-night text-ivory">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-ivory-dim">
          {dict.faq.eyebrow}
        </p>
        <h1 className="mt-2 font-display uppercase text-4xl sm:text-5xl text-center text-ivory">
          {dict.footer.faqContact}
        </h1>
        <p className="mt-3 text-center text-ivory-dim">
          {dict.faq.intro}
        </p>
        <div className="mt-12">
          <Accordion items={faqItems} tone="dark" firstOpen />
        </div>

        <section className="mt-20">
          <h2 className="font-display uppercase text-2xl sm:text-3xl text-ivory">
            {dict.faq.contact.heading}
          </h2>
          <p className="mt-2 text-sm text-ivory-dim">
            {dict.faq.contact.subheading}
          </p>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}
