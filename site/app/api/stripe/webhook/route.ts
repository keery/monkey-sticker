// Webhook Stripe : confirme les paiements et fait passer la commande de
// « pending » à « paid » (elle entre alors en file d'impression dans l'admin).
//
// Runtime Node obligatoire (vérification de signature = crypto Node). Jamais
// mis en cache.

import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  markOrderPaid,
  markOrderFailed,
  markOrderExpired,
  markOrderRefunded,
} from "@/lib/orders";
import { extractCustomer } from "@/lib/stripe-customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET manquant");
    return new Response("Webhook non configuré", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(body, signature, secret);
  } catch (e) {
    console.error("[webhook] signature invalide:", e instanceof Error ? e.message : e);
    return new Response("Signature invalide", { status: 400 });
  }

  const piId = (s: Stripe.Checkout.Session): string | undefined =>
    typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? undefined;

  switch (event.type) {
    // Paiement confirmé : carte immédiate (completed) ou méthode différée
    // réussie (async_payment_succeeded). On fulfill dès que ce n'est pas
    // « unpaid » (le completed d'un paiement différé arrive encore non réglé).
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "unpaid") {
        const order = await markOrderPaid(session.id, extractCustomer(session), piId(session));
        if (!order) console.error(`[webhook] session payée sans commande liée : ${session.id}`);
      }
      break;
    }

    // Paiement différé refusé (Klarna, Bancontact, MB WAY…).
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await markOrderFailed(session.id);
      break;
    }

    // Session Checkout expirée sans paiement (panier abandonné).
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await markOrderExpired(session.id);
      break;
    }

    // Remboursement (déclenché depuis l'admin ou le Dashboard). On relie la
    // commande via le PaymentIntent mémorisé. Total → « refunded ».
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (pi) {
        const order = await markOrderRefunded(pi, {
          full: charge.refunded, // true = intégralement remboursé
          amount: charge.amount_refunded / 100,
        });
        if (!order) console.error(`[webhook] remboursement sans commande liée : PI ${pi}`);
      }
      break;
    }
  }

  // On acquitte toujours (200) pour éviter les relances inutiles de Stripe.
  return new Response(null, { status: 200 });
}
