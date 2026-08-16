"use client";

import { useState } from "react";
import { trackOrderAction, type TrackedOrder } from "@/lib/order-actions";
import { formatPrice } from "@/lib/format";
import { trackingUrl } from "@/lib/tracking";
import { useI18n } from "@/lib/i18n/context";

const fieldClass =
  "w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-ivory placeholder:text-ivory-dim/70 outline-none focus:border-flame transition-colors";

const STATUS_LABEL: Record<string, string> = {
  new: "En préparation",
  printed: "Imprimée",
  shipped: "Expédiée",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function TrackOrderForm() {
  const { dict } = useI18n();
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setOrder(null);
    const res = await trackOrderAction(id, email);
    setPending(false);
    if (res.ok && res.order) setOrder(res.order);
    else setError(res.error ?? "Suivi indisponible pour le moment.");
  }

  return (
    <>
      <form className="mt-8 space-y-3 text-left" onSubmit={onSubmit}>
        <input
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder={dict.trackOrder.orderNumberPlaceholder}
          aria-label={dict.trackOrder.orderNumberLabel}
          className={fieldClass}
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={dict.trackOrder.emailPlaceholder}
          aria-label={dict.trackOrder.emailLabel}
          className={fieldClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-flame text-night py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors disabled:opacity-60"
        >
          {pending ? "…" : dict.trackOrder.submit}
        </button>
      </form>

      {order && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg text-ivory">{order.id}</span>
            <span className="rounded-full border border-flame/30 bg-flame/10 px-2.5 py-0.5 text-[11px] font-semibold text-flame">
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-ivory-dim">
            Commandé le {formatDate(order.createdAt)} ·{" "}
            {order.payment === "paid" ? "Payée" : "Paiement en attente"}
          </p>
          <p className="mt-1 text-sm text-ivory-dim">
            {order.itemCount} article{order.itemCount > 1 ? "s" : ""} ·{" "}
            <span className="text-ivory">{formatPrice(order.total)}</span>
          </p>
          {order.trackingNumber && (
            <a
              href={trackingUrl(order.trackingNumber)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-flame py-3 text-sm font-bold uppercase tracking-wide text-night transition-colors hover:bg-flame-deep"
            >
              📮 {dict.trackOrder.trackParcel}
            </a>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-left text-ivory-dim">
          {error}
        </p>
      )}
    </>
  );
}
