"use server";

// Tunnel de paiement Stripe — SÉCURITÉ : les prix ne sont JAMAIS ceux envoyés
// par le navigateur. Chaque ligne est reconstruite depuis le catalogue serveur,
// et la remise BOGO est recalculée côté serveur. Le client ne choisit que le
// produit, les options et la quantité.

import { headers } from "next/headers";
import { getProductByHandle } from "./catalog";
import {
  createOrder,
  setOrderSession,
  getOrderBySessionId,
  markOrderPaid,
  type Order,
  type OrderItem,
} from "./orders";
import { computeOrderTotals } from "./order-math";
import { getStripe, isStripeConfigured, CURRENCY } from "./stripe";
import { getCurrentUser } from "./auth";
import { extractCustomer } from "./stripe-customer";
import {
  DEFAULT_LOCALE,
  isLocale,
  localePath,
  LOCALE_STRIPE,
  type Locale,
} from "./i18n/config";
import { getDictionary } from "./i18n/get-dictionary";

export interface CheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
  /** code machine pour un affichage adapté côté client */
  code?: "unconfigured" | "empty" | "invalid" | "stripe_error";
}

const MAX_QTY = 100;

/** Ce que le panier envoie (non fiable). On ne garde que handle/qty/options et,
 * pour le custom, l'image à imprimer. Tout le reste est réhydraté du catalogue. */
interface RawCartItem {
  handle?: unknown;
  qty?: unknown;
  options?: unknown;
  customImage?: unknown;
}

function sanitizeOptions(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.length <= 120) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Reconstruit les lignes de commande à partir du catalogue. Lève une erreur
 * lisible si un article n'existe plus ou si une quantité est invalide. */
async function rebuildOrderItems(raw: RawCartItem[]): Promise<OrderItem[]> {
  const items: OrderItem[] = [];
  for (const r of raw) {
    if (typeof r.handle !== "string") throw new Error("Article invalide dans le panier.");
    const qty = Number(r.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new Error("Quantité invalide dans le panier.");
    }
    const product = await getProductByHandle(r.handle);
    if (!product) {
      throw new Error(`Un article n'est plus disponible (« ${r.handle} »). Retire-le du panier.`);
    }
    const customImage =
      product.kind === "custom" && typeof r.customImage === "string" ? r.customImage : undefined;
    if (product.kind === "custom" && !customImage) {
      throw new Error("Un design personnalisé n'a pas d'image. Recommence la création.");
    }
    items.push({
      handle: product.handle,
      name: product.name,
      price: product.price, // ← prix serveur, source de vérité
      qty,
      kind: product.kind,
      options: sanitizeOptions(r.options),
      theme: product.theme,
      image: product.image,
      customImage,
    });
  }
  return items;
}

/** Pays de livraison acceptés (métropole + Europe proche). */
const SHIPPING_COUNTRIES = [
  "FR", "BE", "LU", "DE", "ES", "IT", "NL", "PT", "AT", "IE", "FI",
] as const;

async function siteOrigin(): Promise<string> {
  // On privilégie l'origine réelle de la requête (marche en local comme en
  // prod derrière un proxy) ; sinon on retombe sur NEXT_PUBLIC_SITE_URL.
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
  } catch {
    /* headers() indisponible hors requête */
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3022";
}

export async function createCheckoutSessionAction(
  itemsJson: string,
  localeArg?: string,
): Promise<CheckoutResult> {
  const locale: Locale = isLocale(localeArg) ? localeArg : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  if (!isStripeConfigured()) {
    return {
      ok: false,
      code: "unconfigured",
      error: dict.checkout.errUnconfigured,
    };
  }

  // 1. Parse + reconstruction serveur des lignes.
  let items: OrderItem[];
  try {
    const raw = JSON.parse(itemsJson);
    if (!Array.isArray(raw) || raw.length === 0) {
      return { ok: false, code: "empty", error: dict.checkout.errEmpty };
    }
    items = await rebuildOrderItems(raw as RawCartItem[]);
  } catch (e) {
    return { ok: false, code: "invalid", error: e instanceof Error ? e.message : dict.checkout.errUnreadable };
  }

  const totals = computeOrderTotals(items);

  try {
    const stripe = getStripe();
    const origin = await siteOrigin();

    // Compte connecté (facultatif) : on relie la commande et on pré-remplit
    // l'e-mail Stripe. Le checkout invité reste possible (user = null).
    const user = await getCurrentUser();

    // 2. Commande en attente AVANT redirection (on tient le fil même si le
    //    client ferme l'onglet ; le webhook la confirmera).
    const order = await createOrder(items, {
      payment: "pending",
      userId: user?.id,
      customerEmail: user?.email,
    });

    // 3. Lignes Stripe au prix plein ; la remise BOGO est portée par un coupon
    //    à usage unique pour rester lisible sur la page de paiement.
    const lineItems = items.map((it) => ({
      quantity: it.qty,
      price_data: {
        currency: CURRENCY,
        unit_amount: Math.round(it.price * 100),
        product_data: {
          name: it.name,
          description: it.options?.Puce ? `${dict.checkout.optionChip} : ${it.options.Puce}` : undefined,
        },
      },
    }));

    const discounts: { coupon: string }[] = [];
    if (totals.bogoDiscount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(totals.bogoDiscount * 100),
        currency: CURRENCY,
        duration: "once",
        name: dict.checkout.couponBogo,
      });
      discounts.push({ coupon: coupon.id });
    }

    // 4. Livraison : adresse toujours collectée (produit physique). Frais
    //    configurables via STRIPE_SHIPPING_CENTS (0 = offerte).
    const shippingCents = Math.max(0, Math.round(Number(process.env.STRIPE_SHIPPING_CENTS) || 0));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: LOCALE_STRIPE[locale] as NonNullable<
        Parameters<typeof stripe.checkout.sessions.create>[0]
      >["locale"],
      line_items: lineItems,
      // discounts n'est passé que s'il y a une remise (Stripe refuse un tableau vide).
      ...(discounts.length ? { discounts } : {}),
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      // Pré-remplit l'e-mail Stripe pour un client connecté (lie la commande).
      ...(user ? { customer_email: user.email } : {}),
      // Propage l'orderId au PaymentIntent → traçable dans le Dashboard et porté
      // par les événements charge/refund liés à ce paiement.
      payment_intent_data: { metadata: { orderId: order.id } },
      shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingCents, currency: CURRENCY },
            display_name: shippingCents === 0 ? dict.checkout.shippingFree : dict.checkout.shippingTracked,
          },
        },
      ],
      success_url: `${origin}${localePath("/checkout/success", locale)}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${localePath("/checkout/cancel", locale)}`,
    });

    if (!session.url) {
      return { ok: false, code: "stripe_error", error: dict.checkout.errNoUrl };
    }

    // 5. On relie la session à la commande (retrouvée par le webhook et la page
    //    de succès).
    await setOrderSession(order.id, session.id);

    return { ok: true, url: session.url };
  } catch (e) {
    console.error("[checkout] échec création session Stripe:", e);
    return {
      ok: false,
      code: "stripe_error",
      error: "Impossible de démarrer le paiement. Réessaie dans un instant.",
    };
  }
}

/** Confirmation de secours, appelée au retour sur /checkout/success.
 *
 * Le webhook Stripe reste la source de vérité, mais il exige
 * STRIPE_WEBHOOK_SECRET (et, en local, la CLI `stripe listen`). Ici on revérifie
 * la session directement auprès de Stripe : si elle est réglée, on bascule la
 * commande en « paid » immédiatement. Cela rend les paiements de test complets
 * sans CLI, et sécurise la prod si le webhook tarde ou se perd.
 *
 * Idempotent (markOrderPaid ne double rien) et sans effet de bord si Stripe
 * n'est pas configuré. Renvoie la commande à jour, ou undefined si la session
 * n'est reliée à aucune commande. */
export async function confirmCheckoutSession(sessionId: string): Promise<Order | undefined> {
  if (typeof sessionId !== "string" || !sessionId) return undefined;
  if (!isStripeConfigured()) return getOrderBySessionId(sessionId);
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      const pi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      const order = await markOrderPaid(session.id, extractCustomer(session), pi);
      if (order) return order;
    }
  } catch (e) {
    // Session inconnue (autre compte / id bidon) ou Stripe indisponible : on
    // retombe sur le registre local sans casser l'affichage de la page succès.
    console.error("[checkout] confirmation session échouée:", e instanceof Error ? e.message : e);
  }
  return getOrderBySessionId(sessionId);
}
