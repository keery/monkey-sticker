"use client";

import Image from "next/image";
import { SITE } from "@/lib/site";
import { useI18n } from "@/lib/i18n/context";
import { LocaleLink } from "./LocaleLink";
import { NewsletterForm } from "./NewsletterForm";
import { Wordmark } from "./Wordmark";

export function Footer() {
  const { dict } = useI18n();

  const columns: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: dict.footer.colShop,
      links: [
        { href: "/collections/all", label: dict.nav.allStickers },
        { href: "/collections/bestsellers", label: dict.nav.bestsellers },
        { href: "/collections/just-dropped", label: dict.nav.justDropped },
        { href: "/create-own", label: dict.nav.createOwn },
      ],
    },
    {
      title: dict.footer.colHelp,
      links: [
        { href: "/pose", label: dict.footer.poseGuide },
        { href: "/pages/track-order", label: dict.nav.trackOrder },
        { href: "/pages/faq", label: dict.footer.faqContact },
        { href: "/pages/livraison", label: dict.footer.shipping },
        { href: "/pages/politique-de-retour", label: dict.footer.returns },
      ],
    },
    {
      title: dict.footer.colLegal,
      links: [
        { href: "/pages/mentions-legales", label: dict.footer.legalNotice },
        { href: "/pages/confidentialite", label: dict.footer.privacy },
        { href: "/pages/cgv", label: dict.footer.terms },
      ],
    },
  ];

  return (
    <footer className="bg-night text-ivory-dim">
      <div className="mx-auto max-w-6xl px-4 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2.5 text-ivory">
            <Image src={SITE.logo} alt="" width={38} height={32} className="h-8 w-auto" />
            <Wordmark className="text-base" />
            <span className="sr-only">{SITE.name}</span>
          </p>
          <p className="mt-2 text-sm max-w-xs">{dict.footer.tagline}</p>
          <div className="mt-5">
            <p className="text-sm font-semibold text-ivory">{dict.footer.newsletterTitle}</p>
            <NewsletterForm compact source="footer" />
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-ivory uppercase tracking-wide">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <LocaleLink href={l.href} className="hover:text-ivory transition-colors">
                    {l.label}
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ivory-dim/70">
          <p>© {new Date().getFullYear()} {SITE.name}. {dict.footer.rights}</p>
          <div className="flex items-center gap-4">
            <a href={SITE.social.instagram} target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
            <a href={SITE.social.tiktok} target="_blank" rel="noreferrer" className="hover:text-white">TikTok</a>
            <a href={SITE.social.facebook} target="_blank" rel="noreferrer" className="hover:text-white">Facebook</a>
          </div>
          <p className="flex items-center gap-2">
            <span className="rounded border border-white/20 px-1.5 py-0.5">CB</span>
            <span className="rounded border border-white/20 px-1.5 py-0.5">Visa</span>
            <span className="rounded border border-white/20 px-1.5 py-0.5">Mastercard</span>
            <span className="rounded border border-white/20 px-1.5 py-0.5">Apple Pay</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
