"use client";

// Vide le panier une fois le paiement confirmé (au montage de la page succès).
// Passe par le contexte pour que le badge du header se mette à jour aussitôt,
// et mémorise le n° de commande via completeOrder.

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";

export function ClearCartOnSuccess({ orderId }: { orderId?: string }) {
  const { completeOrder, clear } = useCart();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (orderId) completeOrder(orderId);
    else clear();
  }, [orderId, completeOrder, clear]);
  return null;
}
