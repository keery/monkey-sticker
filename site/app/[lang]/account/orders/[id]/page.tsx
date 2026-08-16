import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOrdersForUser, type Order } from "@/lib/orders";
import { CardVisual } from "@/components/CardVisual";
import { LocaleLink } from "@/components/LocaleLink";
import { ReorderButton, type ReorderLine } from "@/components/account/ReorderButton";
import { formatPrice } from "@/lib/format";
import { trackingUrl } from "@/lib/tracking";
import { isLocale, DEFAULT_LOCALE, LOCALE_INTL, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { interpolate } from "@/lib/i18n/interpolate";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/orders/[id]">): Promise<Metadata> {
  const { lang, id } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: `${dict.account.orderDetail} · ${id}` };
}

function formatDate(iso: string, locale: Locale): string {
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

/** Étapes visibles par le client : payée → en atelier → expédiée. On n'invente
 * pas de statut « livrée » (non suivi). */
function OrderTimeline({ order, dict }: { order: Order; dict: Dictionary }) {
  const stage = order.payment !== "paid" ? 0 : order.status === "shipped" ? 2 : 1;
  const steps = [dict.account.stepConfirmed, dict.account.statusNew, dict.account.statusShipped];
  return (
    <ol className="flex items-center">
      {steps.map((label, i) => {
        const done = i < stage || (i === stage && order.status === "shipped");
        const current = i === stage && !done;
        const active = done || current;
        return (
          <li key={i} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                  active
                    ? "border-flame bg-flame text-night"
                    : "border-white/20 bg-white/[0.03] text-ivory-dim/60"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-[11px] font-semibold ${active ? "text-ivory" : "text-ivory-dim/60"}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={`mx-2 h-px flex-1 ${i < stage ? "bg-flame/60" : "bg-white/15"}`}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default async function OrderDetailPage({
  params,
}: PageProps<"/[lang]/account/orders/[id]">) {
  const { lang, id } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const user = await requireUser(`/account/orders/${id}`);
  // Recherche via les commandes de l'utilisateur → garantit qu'il s'agit bien
  // de la sienne (pas d'accès à une commande arbitraire par son id).
  const orders = await getOrdersForUser(user.id, user.email);
  const order = orders.find((o) => o.id === id);
  if (!order) notFound();

  const t = order.totals;
  const addr = order.customer?.address;
  const reorderItems: ReorderLine[] = order.items.map((it) => ({
    handle: it.handle,
    name: it.name,
    price: it.price,
    qty: it.qty,
    kind: it.kind,
    options: it.options,
    customImage: it.customImage,
    theme: it.theme,
    image: it.image,
  }));

  const canReorder = order.payment === "paid" || order.payment === "refunded";

  return (
    <div className="space-y-8">
      <LocaleLink
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-ivory-dim transition-colors hover:text-ivory"
      >
        ← {dict.account.backToOrders}
      </LocaleLink>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ivory">{order.id}</h2>
          <p className="mt-1 text-sm text-ivory-dim">
            {interpolate(dict.account.orderedOn, { date: formatDate(order.createdAt, locale) })}
          </p>
        </div>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          {order.payment === "refunded"
            ? dict.account.refunded
            : order.payment === "paid"
              ? dict.account.paid
              : dict.account.paymentPending}
        </span>
      </header>

      {/* Suivi de commande */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <OrderTimeline order={order} dict={dict} />
        {order.status === "shipped" && order.trackingNumber && (
          <a
            href={trackingUrl(order.trackingNumber)}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-flame py-3 text-sm font-bold uppercase tracking-wide text-night transition-colors hover:bg-flame-deep sm:w-auto sm:px-6"
          >
            📮 {dict.account.trackParcel}
          </a>
        )}
      </section>

      {/* Articles */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ivory-dim">
          {dict.account.orderItems}
        </h3>
        <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-white/[0.03]">
          {order.items.map((it, i) => (
            <li key={i} className="flex items-center gap-4 p-4">
              <div className="w-16 shrink-0 overflow-hidden rounded-[4px] border border-white/15 bg-night">
                {it.customImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.customImage} alt={it.name} className="aspect-[856/540] w-full object-cover" />
                ) : it.theme ? (
                  <CardVisual image={it.image} theme={it.theme} seed={it.handle} showChip={false} className="w-full" />
                ) : (
                  <div className="aspect-[856/540] w-full bg-white/5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ivory">{it.name}</p>
                <p className="text-xs text-ivory-dim">
                  <span className="tabular-nums">{it.qty}×</span>
                  {it.options?.Couleur ? ` · ${dict.checkout.optionColor} ${it.options.Couleur.toLowerCase()}` : ""}
                  {it.options?.Puce ? ` · ${dict.checkout.optionChip} ${it.options.Puce.toLowerCase()}` : ""}
                  {it.options?.Encoche ? ` · ${dict.checkout.optionNotch.toLowerCase()}` : ""}
                  {it.qty > 1 ? ` · ${formatPrice(it.price, locale)} ${dict.account.unitEach}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ivory">
                {formatPrice(it.price * it.qty, locale)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Récapitulatif */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ivory-dim">
          {dict.account.orderSummary}
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ivory-dim">{dict.account.subtotal}</dt>
            <dd className="tabular-nums text-ivory">{formatPrice(t.subtotal, locale)}</dd>
          </div>
          {t.bogoDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-ivory-dim">{dict.account.bogoDiscount}</dt>
              <dd className="tabular-nums text-emerald-300">−{formatPrice(t.bogoDiscount, locale)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ivory-dim">{dict.account.shippingLabel}</dt>
            <dd className="text-right text-xs text-ivory-dim/80">{dict.account.shippingValue}</dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 text-base">
            <dt className="font-semibold text-ivory">{dict.account.total}</dt>
            <dd className="font-display tabular-nums text-ivory">{formatPrice(t.total, locale)}</dd>
          </div>
        </dl>
        {order.payment === "refunded" && order.refundedAmount != null && (
          <p className="mt-3 text-xs text-violet-300/90">
            {dict.account.refunded} · {formatPrice(order.refundedAmount, locale)}
          </p>
        )}
      </section>

      {/* Adresse de livraison */}
      {addr?.line1 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ivory-dim">
            {dict.account.shippingAddress}
          </h3>
          <p className="text-sm text-ivory">
            {order.customer?.name && (
              <>
                {order.customer.name}
                <br />
              </>
            )}
            {addr.line1}
            {addr.line2 ? `, ${addr.line2}` : ""}
            <br />
            {[addr.postalCode, addr.city].filter(Boolean).join(" ")}
            {addr.country ? ` · ${addr.country}` : ""}
          </p>
        </section>
      )}

      {/* Actions */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
        {canReorder ? (
          <ReorderButton
            items={reorderItems}
            label={dict.account.reorder}
            addedLabel={dict.account.reorderAdded}
          />
        ) : (
          <span />
        )}
        <LocaleLink
          href="/pages/faq"
          className="text-sm text-ivory-dim transition-colors hover:text-ivory"
        >
          {dict.account.orderProblem}{" "}
          <span className="font-semibold text-flame">{dict.account.contactSupport}</span>
        </LocaleLink>
      </section>
    </div>
  );
}
