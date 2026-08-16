// Calculs de commande partagés client/serveur (pur, sans dépendance).
// Même mécanique BOGO que le panier : 1 unité sticker/custom sur 2 offerte,
// en offrant toujours les moins chères.

export interface OrderLine {
  handle: string;
  name: string;
  price: number;
  qty: number;
  kind: "sticker" | "accessory" | "custom";
  options?: Record<string, string>;
  customImage?: string;
  theme?: unknown;
  image?: string;
}

export interface OrderTotals {
  subtotal: number;
  bogoDiscount: number;
  total: number;
  freeCount: number;
  itemCount: number;
  stickerUnits: number;
}

export function computeOrderTotals(items: OrderLine[]): OrderTotals {
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const units: number[] = [];
  for (const it of items) {
    if (it.kind === "sticker" || it.kind === "custom") {
      for (let i = 0; i < it.qty; i++) units.push(it.price);
    }
  }
  units.sort((a, b) => a - b);
  const freeCount = Math.floor(units.length / 2);
  const bogoDiscount = units.slice(0, freeCount).reduce((s, p) => s + p, 0);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    bogoDiscount: Math.round(bogoDiscount * 100) / 100,
    total: Math.round((subtotal - bogoDiscount) * 100) / 100,
    freeCount,
    itemCount: items.reduce((s, it) => s + it.qty, 0),
    stickerUnits: units.length,
  };
}
