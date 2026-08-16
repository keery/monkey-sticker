"use client";

// Carte commande côté client (lecture seule) — réutilisée par le tableau de bord
// et « mes commandes ».

import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/orders";
import { trackingUrl } from "@/lib/tracking";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/lib/i18n/context";
import { plural } from "@/lib/i18n/interpolate";
import { LOCALE_INTL } from "@/lib/i18n/config";

const STATUS_CLS: Record<string, string> = {
  new: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  printed: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  shipped: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
};

const PAYMENT_CLS: Record<string, string> = {
  pending: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  paid: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300/90",
};

export function OrderCard({ order }: { order: Order }) {
  const { dict, locale } = useI18n();

  const statusLabels: Record<string, string> = {
    new: dict.account.statusNew,
    printed: dict.account.statusPrinted,
    shipped: dict.account.statusShipped,
  };
  const paymentLabels: Record<string, string> = {
    pending: dict.account.paymentPending,
    paid: dict.account.paid,
  };

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(LOCALE_INTL[locale], {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return iso.slice(0, 10);
    }
  }

  const statusCls = STATUS_CLS[order.status] ?? STATUS_CLS.new;
  const statusLabel = statusLabels[order.status] ?? statusLabels.new;
  const paymentCls = PAYMENT_CLS[order.payment] ?? PAYMENT_CLS.paid;
  const paymentLabel = paymentLabels[order.payment] ?? paymentLabels.paid;
  const names = order.items.map((it) => `${it.qty}× ${it.name}`).join(", ");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-lg text-ivory">{order.id}</p>
          <p className="text-xs text-ivory-dim">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${paymentCls}`}>
            {paymentLabel}
          </span>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusCls}`}>
            {statusLabel}
          </span>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-ivory-dim">{names}</p>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-ivory-dim">
          {plural(locale, order.totals.itemCount, dict.account.items, { count: order.totals.itemCount })}
        </span>
        <span className="font-display text-ivory tabular-nums">
          {formatPrice(order.totals.total, locale)}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
        <LocaleLink
          href={`/account/orders/${order.id}`}
          className="text-sm font-semibold text-flame transition-colors hover:text-flame-deep"
        >
          {dict.account.viewDetail} →
        </LocaleLink>
        {order.trackingNumber && (
          <a
            href={trackingUrl(order.trackingNumber)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-flame/30 bg-flame/10 px-3.5 py-1.5 text-xs font-semibold text-flame transition-colors hover:bg-flame/15"
          >
            📮 {dict.account.trackParcel}
          </a>
        )}
      </div>
    </div>
  );
}
