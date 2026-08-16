// Email « Bienvenue newsletter » — envoyé après une inscription à la newsletter.

import { shell } from "../layout";
import { heading, paragraph, pill, divider, button, pageUrl } from "../components";
import { pick, type EmailLocale, type EmailPreview, type NewsletterWelcomeData, type RenderedEmail } from "../types";

interface Copy {
  subject: string;
  preheader: string;
  badge: string;
  hi: string;
  intro: string;
  perk: string;
  ctaShop: string;
  ctaCreate: string;
  unsub: string;
}

const COPY: Partial<Record<EmailLocale, Copy>> = {
  en: {
    subject: "Welcome to the crew 🐒",
    preheader: "You're in — new drops first, and 1 bought = 1 free right now.",
    badge: "Newsletter",
    hi: "You're in! 🐒",
    intro: "Thanks for joining. You'll be the first to see new designs and drops before anyone else.",
    perk: "And right now, across the whole shop: <strong style=\"color:#f4f0e7;\">1 sticker bought = 1 free</strong>. Grab two, pay for one.",
    ctaShop: "Discover the stickers",
    ctaCreate: "Create your own",
    unsub: "Not for you? You can unsubscribe anytime — just reply « stop ».",
  },
  fr: {
    subject: "Bienvenue dans la bande 🐒",
    preheader: "C'est bon — les nouveautés en avant-première, et 1 acheté = 1 offert.",
    badge: "Newsletter",
    hi: "Tu es des nôtres ! 🐒",
    intro: "Merci pour l'inscription. Tu verras les nouveaux designs et les drops avant tout le monde.",
    perk: "Et en ce moment, sur toute la boutique : <strong style=\"color:#f4f0e7;\">1 sticker acheté = 1 offert</strong>. Prends-en deux, paie-en un.",
    ctaShop: "Découvrir les stickers",
    ctaCreate: "Créer le mien",
    unsub: "Pas pour toi ? Tu peux te désinscrire à tout moment — réponds « stop ».",
  },
};

export function renderNewsletterWelcome(o: NewsletterWelcomeData, locale: EmailLocale): RenderedEmail {
  const t = pick(COPY, locale);
  const body = `
    ${pill(t.badge)}
    <div style="height:14px;"></div>
    ${heading(t.hi)}
    ${paragraph(t.intro)}
    ${paragraph(t.perk)}
    <div style="height:16px;"></div>
    ${button(pageUrl(o.siteUrl, locale, "/collections/all"), t.ctaShop, "primary")}
    ${button(pageUrl(o.siteUrl, locale, "/create-own"), t.ctaCreate, "ghost")}
    ${divider()}
    ${paragraph(`<span style="font-size:13px;">${t.unsub}</span>`)}
  `;
  const text = [t.hi, "", t.intro, "", `${t.ctaShop}: ${pageUrl(o.siteUrl, locale, "/collections/all")}`].join("\n");
  return { subject: t.subject, html: shell({ locale, title: t.subject, preheader: t.preheader, body }), text };
}

const SAMPLE: NewsletterWelcomeData = { siteUrl: "https://monkeysticker.fr" };

export const newsletterWelcomePreview: EmailPreview = {
  id: "newsletter-welcome",
  name: "Bienvenue newsletter",
  description: "Envoyé après une inscription à la newsletter.",
  category: "Marketing",
  translated: ["fr", "en"],
  render: (locale) => renderNewsletterWelcome(SAMPLE, locale),
};
