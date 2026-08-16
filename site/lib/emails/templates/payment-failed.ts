// Email « Paiement non abouti » — envoyé si un paiement différé échoue
// (checkout.session.async_payment_failed) : on invite à réessayer.

import { shell } from "../layout";
import { heading, paragraph, pill, divider, button, statBox, pageUrl } from "../components";
import { common } from "../copy";
import { pick, type EmailLocale, type EmailPreview, type PaymentFailedEmailData, type RenderedEmail } from "../types";

interface Copy {
  subject: string;
  preheader: string;
  badge: string;
  hi: (name?: string) => string;
  intro: string;
  reassure: string;
  cta: string;
  help: string;
}

const COPY: Partial<Record<EmailLocale, Copy>> = {
  en: {
    subject: "Your payment didn't go through",
    preheader: "No worries — your cart is still waiting for you.",
    badge: "Payment failed",
    hi: (name) => (name ? `Hi ${name},` : "Hi,"),
    intro: "Your payment couldn't be completed, so this order wasn't confirmed. It happens — nothing was charged.",
    reassure: "Your picks are still in your cart. Pick up where you left off in a couple of taps.",
    cta: "Finish my order",
    help: "Card giving you trouble? Reply to this email, we'll help.",
  },
  fr: {
    subject: "Ton paiement n'a pas abouti",
    preheader: "Pas de panique — ton panier t'attend toujours.",
    badge: "Paiement échoué",
    hi: (name) => (name ? `Bonjour ${name},` : "Bonjour,"),
    intro: "Ton paiement n'a pas pu être finalisé, la commande n'a donc pas été confirmée. Ça arrive — rien n'a été débité.",
    reassure: "Tes trouvailles sont toujours dans ton panier. Reprends où tu t'es arrêté·e en deux clics.",
    cta: "Finaliser ma commande",
    help: "Un souci avec ta carte ? Réponds à cet email, on t'aide.",
  },
};

export function renderPaymentFailed(o: PaymentFailedEmailData, locale: EmailLocale): RenderedEmail {
  const t = pick(COPY, locale);
  const c = common(locale);
  const body = `
    ${pill(t.badge)}
    <div style="height:14px;"></div>
    ${heading(t.hi(o.customerName))}
    ${paragraph(t.intro)}
    ${statBox(c.order, o.orderId)}
    ${paragraph(t.reassure)}
    <div style="height:16px;"></div>
    ${button(pageUrl(o.siteUrl, locale, "/collections/all"), t.cta, "primary")}
    ${divider()}
    ${paragraph(`<span style="font-size:13px;">${t.help}</span>`)}
  `;
  const text = [t.hi(o.customerName), "", t.intro, t.reassure, "", `${t.cta}: ${pageUrl(o.siteUrl, locale, "/collections/all")}`].join("\n");
  return { subject: t.subject, html: shell({ locale, title: t.subject, preheader: t.preheader, body }), text };
}

const SAMPLE: PaymentFailedEmailData = {
  orderId: "MS-10042",
  customerName: "Camille",
  siteUrl: "https://monkeysticker.fr",
};

export const paymentFailedPreview: EmailPreview = {
  id: "payment-failed",
  name: "Paiement non abouti",
  description: "Envoyé si un paiement différé (Klarna, Bancontact…) échoue.",
  category: "Commandes",
  translated: ["fr", "en"],
  render: (locale) => renderPaymentFailed(SAMPLE, locale),
};
