"use client";

// Bandeau offre : une seule offre, dite une fois, calmement.
// (Le compte à rebours « evergreen » a été retiré : fausse urgence.)

import { useI18n } from "@/lib/i18n/context";
import { LocaleLink } from "./LocaleLink";

export function AnnouncementBar() {
  const { dict } = useI18n();
  // Toute la barre est cliquable — surtout sur mobile, où le lien texte seul
  // était masqué (`hidden sm:inline`) : rien n'était tappable.
  return (
    <LocaleLink
      href="/collections/all"
      className="block bg-flame text-night text-center text-xs sm:text-sm py-2 px-3 font-semibold hover:opacity-90 active:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-night"
    >
      <span className="tracking-wide uppercase">{dict.announcement.text}</span>
      <span className="underline underline-offset-2 hidden sm:inline ml-3">
        {dict.announcement.cta}
      </span>
    </LocaleLink>
  );
}
