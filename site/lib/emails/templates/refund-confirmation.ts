// Email « Remboursement confirmé » — envoyé au passage en statut `refunded`.

import { shell } from "../layout";
import { heading, paragraph, pill, divider, button, statBox, pageUrl } from "../components";
import { money } from "../theme";
import { pick, type EmailLocale, type EmailPreview, type RefundEmailData, type RenderedEmail } from "../types";

interface Copy {
  subject: (id: string) => string;
  preheader: string;
  badge: string;
  hi: (name?: string) => string;
  intro: (amount: string, id: string) => string;
  amountLabel: string;
  delay: string;
  cta: string;
  help: string;
}

const COPY: Partial<Record<EmailLocale, Copy>> = {
  en: {
    subject: (id) => `Refund issued for order ${id}`,
    preheader: "Your refund is on its way back to your card.",
    badge: "Refunded",
    hi: (name) => (name ? `All done, ${name}.` : "All done."),
    intro: (amount, id) => `We've refunded <strong style="color:#f4f0e7;">${amount}</strong> for order <strong style="color:#f4f0e7;">${id}</strong>. Sorry it didn't work out this time.`,
    amountLabel: "Amount refunded",
    delay: "The amount lands back on your card within 5–10 business days, depending on your bank.",
    cta: "Back to the shop",
    help: "A question about this refund? Just reply to this email.",
  },
  fr: {
    subject: (id) => `Remboursement de la commande ${id}`,
    preheader: "Ton remboursement est en route vers ta carte.",
    badge: "Remboursée",
    hi: (name) => (name ? `C'est réglé, ${name}.` : "C'est réglé."),
    intro: (amount, id) => `On t'a remboursé <strong style="color:#f4f0e7;">${amount}</strong> pour la commande <strong style="color:#f4f0e7;">${id}</strong>. Désolé que ça n'ait pas collé cette fois.`,
    amountLabel: "Montant remboursé",
    delay: "Le montant revient sur ta carte sous 5 à 10 jours ouvrés, selon ta banque.",
    cta: "Retour à la boutique",
    help: "Une question sur ce remboursement ? Réponds simplement à cet email.",
  },
};

export function renderRefundConfirmation(o: RefundEmailData, locale: EmailLocale): RenderedEmail {
  const t = pick(COPY, locale);
  const amount = money(o.amount, locale);
  const body = `
    ${pill(t.badge)}
    <div style="height:14px;"></div>
    ${heading(t.hi(o.customerName))}
    ${paragraph(t.intro(amount, o.orderId))}
    ${statBox(t.amountLabel, amount)}
    ${paragraph(`<span style="font-size:13px;">${t.delay}</span>`)}
    <div style="height:16px;"></div>
    ${button(pageUrl(o.siteUrl, locale, "/collections/all"), t.cta, "primary")}
    ${divider()}
    ${paragraph(`<span style="font-size:13px;">${t.help}</span>`)}
  `;
  const text = [t.hi(o.customerName), "", `${t.amountLabel}: ${amount} (${o.orderId})`, t.delay].join("\n");
  return { subject: t.subject(o.orderId), html: shell({ locale, title: t.subject(o.orderId), preheader: t.preheader, body }), text };
}

const SAMPLE: RefundEmailData = {
  orderId: "MS-10042",
  amount: 24.98,
  customerName: "Camille",
  siteUrl: "https://monkeysticker.fr",
};

export const refundConfirmationPreview: EmailPreview = {
  id: "refund-confirmation",
  name: "Remboursement confirmé",
  description: "Envoyé au passage en statut « remboursée » (refund Stripe).",
  category: "Commandes",
  translated: ["fr", "en"],
  render: (locale) => renderRefundConfirmation(SAMPLE, locale),
};
