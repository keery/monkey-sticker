// Registre des commandes, adossé à Postgres (table orders : clés promues +
// objet complet en JSONB). NE PAS importer côté client.

import { pool, ensureSchema } from "./db";
import type { ImageTransform, Theme } from "./products";
import { computeOrderTotals, type OrderTotals } from "./order-math";

// Statut de traitement (production / logistique).
export type OrderStatus = "new" | "printed" | "shipped";
// Statut de paiement, distinct du traitement : une commande n'entre en file
// d'impression qu'une fois « paid » (confirmé par le webhook Stripe).
//   pending  : créée, en attente de paiement
//   paid     : paiement confirmé (entre en file d'impression)
//   failed   : paiement différé (Klarna, Bancontact…) refusé
//   expired  : session Checkout expirée sans paiement (panier abandonné)
//   refunded : remboursée après paiement (sort de la file d'impression)
export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "refunded";

export interface OrderItem {
  handle: string;
  name: string;
  price: number;
  qty: number;
  kind: "sticker" | "accessory" | "custom";
  options?: Record<string, string>;
  customImage?: string; // dataURL (commandes personnalisées)
  theme?: Theme;
  image?: string; // artwork catalogue (/designs/…) — image de la couleur choisie si variante
  /** cadrage/fond figés à la commande — renseignés pour les articles à variante
   * de couleur (l'image de la couleur ne partage pas le cadrage résolu par handle,
   * qui vaut la couleur principale). Absent = résolu par handle à l'impression. */
  imageTransform?: ImageTransform;
  imageBackground?: string;
}

/** Coordonnées client renvoyées par Stripe Checkout (adresse de livraison). */
export interface OrderCustomer {
  email?: string;
  name?: string;
  address?: {
    line1?: string;
    line2?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
}

export interface Order {
  id: string; // MS-10042
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  totals: OrderTotals;
  payment: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string; // relie les remboursements (charge.refunded → commande)
  paidAt?: string;
  canceledAt?: string; // horodatage d'un échec / d'une expiration
  shippedAt?: string; // horodatage du passage en « shipped »
  trackingNumber?: string; // n° de suivi La Poste (lettre suivie), saisi à l'expédition
  refundedAt?: string;
  refundedAmount?: number; // montant remboursé en € (utile pour un remboursement partiel)
  customer?: OrderCustomer;
  /** Compte lié quand l'achat est fait connecté (le checkout invité n'en a pas).
   * La liaison « mes commandes » se fait aussi par e-mail (rétro-compatible). */
  userId?: number;
}

// Rétro-compat : les commandes créées avant l'ajout du paiement Stripe n'ont
// pas de champ `payment` — on les considère payées pour qu'elles restent visibles.
function rowToOrder(data: Order): Order {
  return { ...data, payment: data.payment ?? "paid" };
}

export async function getOrders(): Promise<Order[]> {
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT data FROM orders ORDER BY created_at ASC, id ASC`,
  );
  return rows.map((r) => rowToOrder(r.data as Order));
}

export async function createOrder(
  items: OrderItem[],
  opts: {
    payment?: PaymentStatus;
    stripeSessionId?: string;
    /** Compte connecté au moment de l'achat (checkout invité : non fourni). */
    userId?: number;
    /** Pré-remplit customer.email pour lier la commande dès sa création. */
    customerEmail?: string;
  } = {},
): Promise<Order> {
  await ensureSchema();
  // numérotation lisible et sans course : MS-10001, MS-10002… via séquence Postgres
  const { rows } = await pool.query(
    `SELECT 'MS-' || nextval('order_number_seq') AS id`,
  );
  const order: Order = {
    id: rows[0].id as string,
    createdAt: new Date().toISOString(),
    status: "new",
    items,
    totals: computeOrderTotals(items),
    payment: opts.payment ?? "paid",
    stripeSessionId: opts.stripeSessionId,
    userId: opts.userId,
    customer: opts.customerEmail ? { email: opts.customerEmail } : undefined,
  };
  await pool.query(
    `INSERT INTO orders (id, created_at, stripe_session_id, data)
       VALUES ($1, $2, $3, $4)`,
    [order.id, order.createdAt, order.stripeSessionId ?? null, order],
  );
  return order;
}

export async function getOrderBySessionId(sessionId: string): Promise<Order | undefined> {
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT data FROM orders WHERE stripe_session_id = $1`,
    [sessionId],
  );
  return rows[0] ? rowToOrder(rows[0].data as Order) : undefined;
}

function emailEq(a: string | undefined, b: string): boolean {
  return (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
}

/** Commandes d'un client, par e-mail (insensible à la casse), récentes d'abord.
 * Récupère aussi les achats faits en invité avec la même adresse. */
export async function getOrdersForEmail(email: string): Promise<Order[]> {
  const orders = await getOrders();
  return orders
    .filter((o) => emailEq(o.customer?.email, email))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Comme getOrdersForEmail, mais rattrape aussi les commandes liées par userId
 * (ceinture + bretelles si l'e-mail Stripe diffère de celui du compte). */
export async function getOrdersForUser(userId: number, email: string): Promise<Order[]> {
  const orders = await getOrders();
  return orders
    .filter((o) => o.userId === userId || emailEq(o.customer?.email, email))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Suivi invité : exige l'id ET l'e-mail (secret partagé, pas d'énumération). */
export async function getOrderByIdAndEmail(
  id: string,
  email: string,
): Promise<Order | undefined> {
  const orders = await getOrders();
  return orders.find(
    (o) => o.id.toUpperCase() === id.trim().toUpperCase() && emailEq(o.customer?.email, email),
  );
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT data FROM orders WHERE id = $1`, [id]);
  return rows[0] ? rowToOrder(rows[0].data as Order) : undefined;
}

/** Associe une session Stripe à une commande créée juste avant la redirection. */
export async function setOrderSession(orderId: string, sessionId: string): Promise<void> {
  await ensureSchema();
  const { rowCount } = await pool.query(
    `UPDATE orders
       SET stripe_session_id = $2,
           data = jsonb_set(data, '{stripeSessionId}', to_jsonb($2::text))
       WHERE id = $1`,
    [orderId, sessionId],
  );
  if (!rowCount) throw new Error(`commande introuvable : ${orderId}`);
}

/** Lecture-modification-écriture atomique d'une commande, avec verrou de ligne
 * (FOR UPDATE) pour que deux webhooks concurrents ne se marchent pas dessus.
 * `whereSql` sélectionne la ligne (par session ou par PaymentIntent) via $1.
 * Renvoie la commande à jour, ou undefined si aucune ligne ne correspond. */
async function mutateOrder(
  whereSql: string,
  param: string,
  mutate: (o: Order) => void,
): Promise<Order | undefined> {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, data FROM orders WHERE ${whereSql} FOR UPDATE`,
      [param],
    );
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return undefined;
    }
    const order = rowToOrder(rows[0].data as Order);
    mutate(order);
    await client.query(`UPDATE orders SET data = $2 WHERE id = $1`, [rows[0].id, order]);
    await client.query("COMMIT");
    return order;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Confirme le paiement (webhook Stripe ou filet page succès). Idempotent : ne
 * bascule en « paid » que depuis « pending » — un événement rejoué, ou une
 * commande déjà remboursée, n'est jamais ré-écrasé. Renvoie undefined si la
 * session est inconnue. */
export async function markOrderPaid(
  sessionId: string,
  customer?: OrderCustomer,
  paymentIntentId?: string,
): Promise<Order | undefined> {
  return mutateOrder("stripe_session_id = $1", sessionId, (order) => {
    if (order.payment === "pending") {
      order.payment = "paid";
      order.paidAt = new Date().toISOString();
    }
    if (customer) order.customer = customer;
    // On mémorise le PaymentIntent (backfill possible sur un événement rejoué) :
    // c'est la clé qui reliera un futur remboursement à cette commande.
    if (paymentIntentId && !order.stripePaymentIntentId) {
      order.stripePaymentIntentId = paymentIntentId;
    }
  });
}

/** Session Checkout expirée (panier abandonné). Ne touche jamais une commande
 * déjà payée. */
export async function markOrderExpired(sessionId: string): Promise<Order | undefined> {
  return mutateOrder("stripe_session_id = $1", sessionId, (order) => {
    if (order.payment === "pending") {
      order.payment = "expired";
      order.canceledAt = new Date().toISOString();
    }
  });
}

/** Paiement différé (Klarna, Bancontact, MB WAY…) refusé. */
export async function markOrderFailed(sessionId: string): Promise<Order | undefined> {
  return mutateOrder("stripe_session_id = $1", sessionId, (order) => {
    if (order.payment === "pending") {
      order.payment = "failed";
      order.canceledAt = new Date().toISOString();
    }
  });
}

/** Remboursement (déclenché depuis l'admin ou le Dashboard, relayé par le
 * webhook charge.refunded). `full` = remboursement total → la commande passe
 * « refunded » et sort de la file d'impression ; sinon on note le montant. */
export async function markOrderRefunded(
  paymentIntentId: string,
  opts: { full: boolean; amount?: number },
): Promise<Order | undefined> {
  return mutateOrder("data->>'stripePaymentIntentId' = $1", paymentIntentId, (order) => {
    if (typeof opts.amount === "number") order.refundedAmount = opts.amount;
    if (opts.full && order.payment === "paid") {
      order.payment = "refunded";
      order.refundedAt = new Date().toISOString();
    }
  });
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await ensureSchema();
  const { rowCount } = await pool.query(
    `UPDATE orders SET data = jsonb_set(data, '{status}', to_jsonb($2::text)) WHERE id = $1`,
    [id, status],
  );
  if (!rowCount) throw new Error(`commande introuvable : ${id}`);
}

/** Passe la commande en « expédiée » et enregistre son n° de suivi (La Poste
 * lettre suivie). Rejouable : réappeler avec un autre numéro corrige une
 * coquille sans réécrire la date d'expédition (COALESCE) ; un numéro vide efface
 * le suivi. `status`, `trackingNumber` et `shippedAt` sont posés en une écriture. */
export async function setOrderShipped(id: string, trackingNumber?: string): Promise<void> {
  await ensureSchema();
  const clean = trackingNumber?.trim() || null;
  const now = new Date().toISOString();
  const { rowCount } = await pool.query(
    `UPDATE orders
        SET data = data || jsonb_build_object(
              'status', 'shipped',
              'trackingNumber', $2::text,
              'shippedAt', COALESCE(data->>'shippedAt', $3::text)
            )
      WHERE id = $1`,
    [id, clean, now],
  );
  if (!rowCount) throw new Error(`commande introuvable : ${id}`);
}

/** Toutes les unités sticker/custom à imprimer pour un lot de commandes
 * (1 entrée par exemplaire physique, qty dépliée). */
export interface PrintUnit {
  orderId: string;
  name: string;
  handle: string;
  theme?: Theme;
  image?: string;
  customImage?: string;
  options?: Record<string, string>;
  /** cadrage/fond figés (article à variante) — priment sur la résolution par handle. */
  imageTransform?: ImageTransform;
  imageBackground?: string;
}

export function flattenPrintUnits(orders: Order[]): PrintUnit[] {
  const units: PrintUnit[] = [];
  for (const o of orders) {
    for (const it of o.items) {
      if (it.kind !== "sticker" && it.kind !== "custom") continue;
      for (let i = 0; i < it.qty; i++) {
        units.push({
          orderId: o.id,
          name: it.name,
          handle: it.handle,
          theme: it.theme,
          image: it.image,
          customImage: it.customImage,
          options: it.options,
          imageTransform: it.imageTransform,
          imageBackground: it.imageBackground,
        });
      }
    }
  }
  return units;
}
