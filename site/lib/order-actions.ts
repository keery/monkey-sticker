"use server";

// Server Actions commandes : gestion des statuts d'atelier + remboursement.

import { revalidatePath } from "next/cache";
import {
  setOrderStatus,
  setOrderShipped,
  getOrderById,
  getOrderByIdAndEmail,
  markOrderRefunded,
  type OrderStatus,
  type PaymentStatus,
} from "./orders";
import { requireAdmin } from "./auth";
import { getStripe } from "./stripe";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Vue publique d'une commande (suivi invité) — aucune donnée sensible. */
export interface TrackedOrder {
  id: string;
  createdAt: string;
  status: OrderStatus;
  payment: PaymentStatus;
  itemCount: number;
  total: number;
  trackingNumber?: string;
}

export interface TrackResult {
  ok: boolean;
  order?: TrackedOrder;
  error?: string;
}

/** Suivi de commande public : id + e-mail (secret partagé), sans compte.
 * Ne renvoie qu'un DTO minimal, jamais l'adresse ni les coordonnées. */
export async function trackOrderAction(id: string, email: string): Promise<TrackResult> {
  const cleanId = (id ?? "").trim();
  const cleanEmail = (email ?? "").trim().toLowerCase();
  if (!/^MS-\d+$/i.test(cleanId) || !EMAIL_RE.test(cleanEmail)) {
    return { ok: false, error: "Numéro de commande ou e-mail invalide." };
  }
  const order = await getOrderByIdAndEmail(cleanId, cleanEmail);
  if (!order) {
    return { ok: false, error: "Aucune commande ne correspond à ce numéro et cet e-mail." };
  }
  return {
    ok: true,
    order: {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      payment: order.payment,
      itemCount: order.totals.itemCount,
      total: order.totals.total,
      trackingNumber: order.trackingNumber,
    },
  };
}

// Le checkout passe désormais par Stripe (voir lib/checkout.ts). Ce module ne
// garde que les actions d'atelier : changement de statut de traitement.

export async function setOrderStatusAction(id: string, status: OrderStatus): Promise<void> {
  await requireAdmin();
  await setOrderStatus(id, status);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/** Marque une commande « expédiée » et enregistre son n° de suivi (La Poste
 * lettre suivie). Sert aussi à corriger le numéro d'une commande déjà expédiée
 * (le statut reste « shipped »). Le numéro est facultatif — une lettre sans
 * suivi reste possible. */
export async function shipOrderAction(
  id: string,
  trackingNumber: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const order = await getOrderById(id);
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.payment !== "paid") {
    return { ok: false, error: "Seule une commande payée peut être expédiée." };
  }
  await setOrderShipped(id, trackingNumber);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

export async function markBatchPrintedAction(ids: string[]): Promise<void> {
  await requireAdmin();
  for (const id of ids) {
    await setOrderStatus(id, "printed");
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/** Rembourse intégralement une commande via Stripe, puis la marque « refunded ».
 * Le webhook `charge.refunded` fera la même bascule de façon idempotente (utile
 * si le remboursement est fait depuis le Dashboard Stripe plutôt qu'ici). */
export async function refundOrderAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const order = await getOrderById(id);
  if (!order) return { ok: false, error: "Commande introuvable." };
  if (order.payment === "refunded") return { ok: true }; // déjà remboursée
  if (order.payment !== "paid") {
    return { ok: false, error: "Seule une commande payée peut être remboursée." };
  }
  if (!order.stripePaymentIntentId) {
    return { ok: false, error: "Paiement Stripe introuvable pour cette commande." };
  }

  try {
    await getStripe().refunds.create({ payment_intent: order.stripePaymentIntentId });
    await markOrderRefunded(order.stripePaymentIntentId, {
      full: true,
      amount: order.totals.total,
    });
  } catch (e) {
    console.error("[refund] échec:", e);
    return { ok: false, error: "Le remboursement a échoué. Réessaie depuis le Dashboard Stripe." };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}
