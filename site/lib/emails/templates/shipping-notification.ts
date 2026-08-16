// Email « Commande expédiée » — envoyé au passage en statut `shipped`.

import { shell } from "../layout";
import { heading, paragraph, pill, divider, button, statBox, itemsTable, addressBlock, pageUrl } from "../components";
import { common } from "../copy";
import { pick, type EmailLocale, type EmailPreview, type RenderedEmail, type ShippingEmailData } from "../types";

interface Copy {
  subject: (id: string) => string;
  preheader: string;
  badge: string;
  hi: (name?: string) => string;
  intro: string;
  shipTitle: string;
  carrierLabel: string;
  ctaTrackParcel: string;
  ctaPose: string;
  help: string;
}

const COPY: Partial<Record<EmailLocale, Copy>> = {
  en: {
    subject: (id) => `Your order ${id} is on its way 📮`,
    preheader: "Good news — your stickers just left the workshop.",
    badge: "Shipped",
    hi: (name) => (name ? `On its way, ${name}!` : "It's on its way!"),
    intro: "Your stickers just left our workshop as a tracked letter. Here's what's inside:",
    shipTitle: "Shipping to",
    carrierLabel: "Carrier",
    ctaTrackParcel: "Track my parcel",
    ctaPose: "Fitting in 60s",
    help: "A question about delivery? Just reply to this email.",
  },
  fr: {
    subject: (id) => `Ta commande ${id} est expédiée 📮`,
    preheader: "Bonne nouvelle — tes stickers viennent de quitter l'atelier.",
    badge: "Expédiée",
    hi: (name) => (name ? `C'est parti, ${name} !` : "C'est parti !"),
    intro: "Tes stickers viennent de quitter l'atelier en lettre suivie. Voici ce qu'il y a dedans :",
    shipTitle: "Livraison à",
    carrierLabel: "Transporteur",
    ctaTrackParcel: "Suivre mon colis",
    ctaPose: "La pose en 60 s",
    help: "Une question sur la livraison ? Réponds simplement à cet email.",
  },
};

export function renderShippingNotification(o: ShippingEmailData, locale: EmailLocale): RenderedEmail {
  const t = pick(COPY, locale);
  const c = common(locale);
  const track = o.trackingUrl ?? pageUrl(o.siteUrl, locale, "/pages/track-order");
  const body = `
    ${pill(t.badge)}
    <div style="height:14px;"></div>
    ${heading(t.hi(o.customerName))}
    ${paragraph(t.intro)}
    ${statBox(c.order, o.orderId)}
    ${itemsTable(o.items, locale)}
    ${o.carrier ? `<div style="height:16px;"></div>${statBox(t.carrierLabel, o.carrier)}` : ""}
    ${o.address ? divider() + addressBlock(t.shipTitle, o.address) : ""}
    <div style="height:26px;"></div>
    ${button(track, t.ctaTrackParcel, "primary")}
    ${button(pageUrl(o.siteUrl, locale, "/pose"), t.ctaPose, "ghost")}
    ${divider()}
    ${paragraph(`<span style="font-size:13px;">${t.help}</span>`)}
  `;
  const text = [t.hi(o.customerName), "", t.intro, "", `${c.order}: ${o.orderId}`, `${t.ctaTrackParcel}: ${track}`].join("\n");
  return { subject: t.subject(o.orderId), html: shell({ locale, title: t.subject(o.orderId), preheader: t.preheader, body }), text };
}

const SAMPLE: ShippingEmailData = {
  orderId: "MS-10042",
  items: [
    { name: "Angel", qty: 2, price: 11.99, options: { Puce: "Grande" } },
    { name: "Or Noir", qty: 1, price: 12.99 },
  ],
  subtotal: 36.97, discount: 11.99, shipping: 0, total: 24.98, freeCount: 1,
  customerName: "Camille",
  carrier: "La Poste — Lettre suivie",
  trackingUrl: "https://www.laposte.fr/outils/suivre-vos-envois?code=XX000000000FR",
  address: { name: "Camille Martin", line1: "12 rue des Lilas", postalCode: "75011", city: "Paris", country: "FR" },
  siteUrl: "https://monkeysticker.fr",
};

export const shippingNotificationPreview: EmailPreview = {
  id: "shipping-notification",
  name: "Commande expédiée",
  description: "Envoyé au passage en statut « expédiée » (avec suivi si dispo).",
  category: "Commandes",
  translated: ["fr", "en"],
  render: (locale) => renderShippingNotification(SAMPLE, locale),
};
