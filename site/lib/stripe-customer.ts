// Extraction des coordonnées client depuis une session Stripe Checkout.
// Partagé par le webhook (confirmation asynchrone) et la page /checkout/success
// (confirmation de secours au retour). Import de type uniquement : aucun code
// Stripe n'est embarqué, mais ce module reste côté serveur (adresse client).

import type Stripe from "stripe";
import type { OrderCustomer } from "./orders";

// Champs d'adresse de livraison selon les versions d'API : on lit de façon
// tolérante sans dépendre d'un shape précis.
interface ShippingLike {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
}

export function extractCustomer(session: Stripe.Checkout.Session): OrderCustomer {
  const details = session.customer_details;
  const shipping =
    (session as unknown as { shipping_details?: ShippingLike }).shipping_details ??
    (session as unknown as { collected_information?: { shipping_details?: ShippingLike } })
      .collected_information?.shipping_details ??
    null;
  const addr = shipping?.address ?? details?.address ?? null;
  return {
    email: details?.email ?? undefined,
    name: shipping?.name ?? details?.name ?? undefined,
    address: addr
      ? {
          line1: addr.line1 ?? undefined,
          line2: addr.line2 ?? undefined,
          postalCode: addr.postal_code ?? undefined,
          city: addr.city ?? undefined,
          country: addr.country ?? undefined,
        }
      : undefined,
  };
}
