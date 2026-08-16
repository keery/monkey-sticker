import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/TrackOrderForm";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/pages/track-order">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: dict.nav.trackOrder };
}

export default async function TrackOrderPage({
  params,
}: PageProps<"/[lang]/pages/track-order">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  return (
    <div className="bg-night text-ivory">
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display uppercase text-4xl sm:text-5xl text-ivory">
          {dict.nav.trackOrder}
        </h1>
        <p className="mt-4 text-ivory-dim">{dict.trackOrder.intro}</p>
        <TrackOrderForm />
        <p className="mt-8 text-xs text-ivory-dim/70">{dict.trackOrder.help}</p>
      </div>
    </div>
  );
}
