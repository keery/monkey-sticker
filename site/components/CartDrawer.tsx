"use client";

// Tiroir panier coulissant en peau de nuit — quantités, BOGO, total,
// checkout factice.

import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n/context";
import { plural } from "@/lib/i18n/interpolate";
import { CardVisual } from "./CardVisual";
import { CheckoutButton } from "./CheckoutButton";

export function CartDrawer() {
  const { items, totals, isOpen, closeCart, setQty, removeItem } = useCart();
  const { dict, locale } = useI18n();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={closeCart}
          aria-hidden
        />
      )}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-night text-ivory border-l border-white/10 shadow-2xl transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label={dict.cart.title}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          <p className="font-bold text-lg">
            {dict.cart.title}{" "}
            {totals.itemCount > 0 && (
              <span className="text-ivory-dim font-normal">({totals.itemCount})</span>
            )}
          </p>
          <button onClick={closeCart} className="p-2 hover:opacity-60" aria-label={dict.common.close}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <p className="text-lg font-semibold">{dict.cart.empty}</p>
            <p className="text-sm text-ivory-dim">{dict.cart.emptyHint}</p>
            <button
              onClick={closeCart}
              className="mt-2 rounded-full bg-ivory text-night px-6 py-3 text-sm font-semibold hover:bg-white transition-colors"
            >
              {dict.cart.viewDesigns}
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map((it) => {
                return (
                  <li key={it.id} className="flex gap-3 items-center">
                    <div className="w-20 shrink-0 rounded-lg overflow-hidden border border-white/10">
                      {it.customImage ? (
                        // aperçu du design uploadé par le client
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.customImage} alt={it.name} className="w-full aspect-[856/540] object-cover" />
                      ) : it.theme ? (
                        <CardVisual image={it.image} theme={it.theme} seed={it.handle} className="w-full" />
                      ) : (
                        <div className="w-full aspect-[856/540] bg-white/10" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{it.name}</p>
                      {it.options &&
                        Object.entries(it.options).map(([k, v]) => (
                          <p key={k} className="text-xs text-ivory-dim">
                            {k} : {v}
                          </p>
                        ))}
                      <div className="mt-1.5 inline-flex items-center border border-white/20 rounded-full">
                        <button onClick={() => setQty(it.id, it.qty - 1)} className="px-2.5 py-1 text-sm" aria-label={dict.common.decrease}>−</button>
                        <span className="px-1 text-sm tabular-nums">{it.qty}</span>
                        <button onClick={() => setQty(it.id, it.qty + 1)} className="px-2.5 py-1 text-sm" aria-label={dict.common.increase}>+</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatPrice(it.price * it.qty, locale)}</p>
                      <button onClick={() => removeItem(it.id)} className="text-xs text-ivory-dim underline hover:text-ivory">
                        {dict.cart.remove}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-white/10 px-5 py-4 space-y-2">
              {totals.freeCount > 0 && (
                <div className="flex justify-between text-sm text-flame">
                  <span>{plural(locale, totals.freeCount, dict.cart.bogo, { count: totals.freeCount })}</span>
                  <span className="tabular-nums">−{formatPrice(totals.bogoDiscount, locale)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-ivory-dim">
                <span>{dict.cart.subtotal}</span>
                <span className="tabular-nums">{formatPrice(totals.subtotal, locale)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>{dict.cart.total}</span>
                <span className="tabular-nums">{formatPrice(totals.total, locale)}</span>
              </div>
              <p className="text-xs text-ivory-dim/70">{dict.cart.shippingNote}</p>
              <CheckoutButton />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
