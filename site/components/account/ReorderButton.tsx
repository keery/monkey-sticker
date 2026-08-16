"use client";

// « Commander à nouveau » : recharge les articles d'une commande passée dans le
// panier local (même mécanique BOGO), puis ouvre le tiroir panier. Réachat en
// un clic — utile pour un consommable comme le sticker (et pour re-commander un
// design custom déjà validé).

import { useState } from "react";
import { useCart, type CartItem } from "@/lib/cart";

/** Une ligne à recharger : l'article panier (hors id/qty auto-générés) + sa qté. */
export type ReorderLine = Omit<CartItem, "id" | "qty"> & { qty: number };

export function ReorderButton({
  items,
  label,
  addedLabel,
}: {
  items: ReorderLine[];
  label: string;
  addedLabel: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        for (const { qty, ...line } of items) addItem(line, qty);
        setAdded(true);
      }}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-flame px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-night transition-colors hover:bg-flame-deep"
    >
      {added ? addedLabel : label}
    </button>
  );
}
