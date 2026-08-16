// Bandeau défilant de réassurance, en peau de nuit : une bande bordée
// discrète, les séparateurs ✦ en flamme comme des veilleuses.

import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function StatsMarquee() {
  const raw = await lang();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const row = dict.stats.items.map((t, i) => (
    <span key={i} className="mx-6 inline-flex items-center gap-6">
      <span className="font-bold uppercase tracking-wide text-ivory">{t}</span>
      <span aria-hidden className="text-flame">✦</span>
    </span>
  ));
  return (
    <div className="overflow-hidden border-y border-white/5 bg-night-2/60 py-3.5 text-sm whitespace-nowrap fade-x-mask">
      <div className="animate-marquee inline-block">
        {row}
        {row}
      </div>
    </div>
  );
}
