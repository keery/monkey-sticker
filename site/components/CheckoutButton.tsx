"use client";

// Bouton « Commander » : crée une session Stripe Checkout côté serveur (prix
// recalculés depuis le catalogue) puis redirige vers la page de paiement
// hébergée par Stripe. Le panier est vidé au retour, sur /checkout/success.

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { createCheckoutSessionAction } from "@/lib/checkout";
import { useI18n } from "@/lib/i18n/context";

export function CheckoutButton() {
  const { items } = useCart();
  const { dict, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await createCheckoutSessionAction(JSON.stringify(items), locale);
      if (res.ok && res.url) {
        window.location.href = res.url; // redirection vers Stripe Checkout
        return; // on laisse le spinner tourner pendant la navigation
      }
      setError(res.error ?? dict.checkout.errorStart);
    } catch {
      setError(dict.checkout.errorContact);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        disabled={busy || items.length === 0}
        onClick={checkout}
        className="w-full rounded-full bg-flame text-night py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors disabled:opacity-50"
      >
        {busy ? dict.checkout.buttonBusy : dict.checkout.button}
      </button>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </>
  );
}
