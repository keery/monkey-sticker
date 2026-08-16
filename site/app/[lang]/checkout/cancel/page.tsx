import type { Metadata } from "next";
import { LocaleLink } from "@/components/LocaleLink";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/checkout/cancel">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: dict.checkoutPage.cancelTitle };
}

export default async function CheckoutCancelPage({
  params,
}: PageProps<"/[lang]/checkout/cancel">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  return (
    <div className="bg-night text-ivory">
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display uppercase text-4xl sm:text-5xl text-ivory">
          {dict.checkoutPage.cancelTitle}
        </h1>
        <p className="mt-4 text-ivory-dim">
          {dict.checkoutPage.cancelBody}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <LocaleLink
            href="/collections/all"
            className="rounded-full bg-flame text-night px-7 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors"
          >
            {dict.checkoutPage.cancelCtaBack}
          </LocaleLink>
          <LocaleLink
            href="/pages/faq"
            className="rounded-full border border-white/25 text-ivory px-7 py-3.5 text-sm font-bold uppercase tracking-wide hover:border-ivory hover:bg-white/5 transition-colors"
          >
            {dict.checkoutPage.cancelCtaQuestion}
          </LocaleLink>
        </div>
      </div>
    </div>
  );
}
