// Email « Confirmation de commande » — envoyé au passage en `paid`.

import { shell } from "../layout";
import {
  heading, paragraph, pill, divider, button, statBox,
  itemsTable, totalsTable, addressBlock, pageUrl,
} from "../components";
import { common } from "../copy";
import { money } from "../theme";
import { pick, type EmailLocale, type EmailPreview, type OrderEmailData, type RenderedEmail } from "../types";

interface Copy {
  subject: (id: string) => string;
  preheader: string;
  badge: string;
  hi: (name?: string) => string;
  intro: string;
  shipTitle: string;
  eta: string;
  ctaTrack: string;
  ctaPose: string;
  help: string;
}

const COPY: Partial<Record<EmailLocale, Copy>> = {
  en: {
    subject: (id) => `Order ${id} confirmed 🎉`,
    preheader: "Thanks! We've received your order and we're on it.",
    badge: "Order confirmed",
    hi: (name) => (name ? `Thanks, ${name}!` : "Thanks!"),
    intro:
      "We've received your order and payment. Your stickers are cut and shipped within 48h from France.",
    shipTitle: "Shipping to",
    eta: "Tracked letter — no signature needed. You'll get a note when it ships.",
    ctaTrack: "Track my order",
    ctaPose: "Fitting in 60s",
    help: "Wrong address or a question? Just reply to this email.",
  },
  fr: {
    subject: (id) => `Commande ${id} confirmée 🎉`,
    preheader: "Merci ! On a bien reçu ta commande, on s'y met.",
    badge: "Commande confirmée",
    hi: (name) => (name ? `Merci ${name} !` : "Merci !"),
    intro:
      "On a bien reçu ta commande et ton paiement. Tes stickers sont découpés et expédiés sous 48 h depuis la France.",
    shipTitle: "Livraison à",
    eta: "Lettre suivie — sans signature. Tu recevras un mot au moment de l'expédition.",
    ctaTrack: "Suivre ma commande",
    ctaPose: "La pose en 60 s",
    help: "Mauvaise adresse ou une question ? Réponds simplement à cet email.",
  },
};

export function renderOrderConfirmation(o: OrderEmailData, locale: EmailLocale): RenderedEmail {
  const t = pick(COPY, locale);
  const c = common(locale);
  const body = `
    ${pill(t.badge)}
    <div style="height:14px;"></div>
    ${heading(t.hi(o.customerName))}
    ${paragraph(t.intro)}
    ${statBox(c.order, o.orderId)}
    ${itemsTable(o.items, locale)}
    ${totalsTable(o, locale)}
    ${o.address ? divider() + addressBlock(t.shipTitle, o.address) : ""}
    <div style="height:26px;"></div>
    ${button(pageUrl(o.siteUrl, locale, "/pages/track-order"), t.ctaTrack, "primary")}
    ${button(pageUrl(o.siteUrl, locale, "/pose"), t.ctaPose, "ghost")}
    ${divider()}
    ${paragraph(`<span style="font-size:13px;">${t.help}</span>`)}
    ${paragraph(`<span style="font-size:13px;">${t.eta}</span>`)}
  `;
  const text = [
    t.hi(o.customerName),
    "",
    t.intro,
    "",
    `${c.order}: ${o.orderId}`,
    ...o.items.map((it) => `- ${it.qty}x ${it.name} — ${money(it.price * it.qty, locale)}`),
    `${c.totals.total}: ${money(o.total, locale)}`,
    "",
    `${t.ctaTrack}: ${pageUrl(o.siteUrl, locale, "/pages/track-order")}`,
  ].join("\n");

  return { subject: t.subject(o.orderId), html: shell({ locale, title: t.subject(o.orderId), preheader: t.preheader, body }), text };
}

const SAMPLE: OrderEmailData = {
  orderId: "MS-10042",
  items: [
    { name: "Angel", qty: 2, price: 11.99, options: { Puce: "Grande" } },
    { name: "Or Noir", qty: 1, price: 12.99 },
  ],
  subtotal: 36.97,
  discount: 11.99,
  shipping: 0,
  total: 24.98,
  freeCount: 1,
  customerName: "Camille",
  address: { name: "Camille Martin", line1: "12 rue des Lilas", postalCode: "75011", city: "Paris", country: "FR" },
  siteUrl: "https://monkeysticker.fr",
};

export const orderConfirmationPreview: EmailPreview = {
  id: "order-confirmation",
  name: "Confirmation de commande",
  description: "Envoyé dès que le paiement est confirmé (statut « paid »).",
  category: "Commandes",
  translated: ["fr", "en"],
  render: (locale) => renderOrderConfirmation(SAMPLE, locale),
};
