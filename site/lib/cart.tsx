"use client";

// Panier local : contexte React + persistance localStorage + mécanique BOGO
// (1 sticker acheté = 1 offert : le moins cher de chaque paire est gratuit).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Theme } from "./products";

export interface CartItem {
  id: string;
  handle: string;
  name: string;
  price: number;
  qty: number;
  kind: "sticker" | "accessory" | "custom";
  options?: Record<string, string>;
  customImage?: string; // dataURL du design uploadé (create-own)
  theme?: Theme; // snapshot du visuel au moment de l'ajout (catalogue dynamique)
  image?: string; // snapshot de l'artwork réel du produit, si présent
}

interface CartTotals {
  subtotal: number;
  bogoDiscount: number;
  total: number;
  freeCount: number;
  itemCount: number;
}

interface CartApi {
  items: CartItem[];
  totals: CartTotals;
  isOpen: boolean;
  lastOrderId: string | null;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "id" | "qty">, qty?: number) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  /** vide le panier et mémorise le n° de la commande passée (pour la confirmation) */
  completeOrder: (orderId: string) => void;
}

const CartContext = createContext<CartApi | null>(null);
const STORAGE_KEY = "monkey-sticker-cart-v1";

function computeTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  // BOGO : sur l'ensemble des unités "sticker" et "custom", 1 sur 2 offerte,
  // en offrant toujours les moins chères.
  const units: number[] = [];
  for (const it of items) {
    if (it.kind === "sticker" || it.kind === "custom") {
      for (let i = 0; i < it.qty; i++) units.push(it.price);
    }
  }
  units.sort((a, b) => a - b); // moins chères d'abord
  const freeCount = Math.floor(units.length / 2);
  const bogoDiscount = units.slice(0, freeCount).reduce((s, p) => s + p, 0);
  return {
    subtotal,
    bogoDiscount,
    total: subtotal - bogoDiscount,
    freeCount,
    itemCount: items.reduce((s, it) => s + it.qty, 0),
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* stockage corrompu : repartir vide */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* quota dépassé (grosse image custom) : le panier vit en mémoire */
    }
  }, [items, hydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, "id" | "qty">, qty = 1) => {
      setItems((prev) => {
        // fusionne si même produit + mêmes options (hors customisé)
        const match = prev.find(
          (it) =>
            it.handle === item.handle &&
            !it.customImage &&
            !item.customImage &&
            JSON.stringify(it.options ?? {}) === JSON.stringify(item.options ?? {}),
        );
        if (match) {
          return prev.map((it) =>
            it.id === match.id ? { ...it, qty: it.qty + qty } : it,
          );
        }
        const id = `${item.handle}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        return [...prev, { ...item, id, qty }];
      });
      setLastOrderId(null); // nouvel ajout : on quitte l'état « commande passée »
      setIsOpen(true);
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((it) => it.id !== id)
        : prev.map((it) => (it.id === id ? { ...it, qty } : it)),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const completeOrder = useCallback((orderId: string) => {
    setItems([]);
    setLastOrderId(orderId);
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      items,
      totals: computeTotals(items),
      isOpen,
      lastOrderId,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      removeItem,
      setQty,
      clear,
      completeOrder,
    }),
    [items, isOpen, lastOrderId, addItem, removeItem, setQty, clear, completeOrder],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé sous <CartProvider>");
  return ctx;
}
