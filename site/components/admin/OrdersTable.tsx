import Link from "next/link";
import type { Order } from "@/lib/orders";
import { setOrderStatusAction } from "@/lib/order-actions";
import { formatPrice } from "@/lib/format";
import { CardVisual } from "@/components/CardVisual";
import { Badge } from "@/components/admin/AdminUI";
import { RefundButton } from "@/components/admin/RefundButton";
import { ShipForm } from "@/components/admin/ShipForm";
import { ORDER_STATUS, PAYMENT_STATUS, btnGhostSm, label } from "@/lib/admin-ui";

// Table de traitement des commandes — partagée par la vue d'ensemble (compacte)
// et la page Commandes (complète, avec la livraison). Vocabulaire de statut et
// d'action strictement identique aux deux endroits.

function OrderThumbs({ order }: { order: Order }) {
  return (
    <div className="flex -space-x-2">
      {order.items.slice(0, 4).map((it, i) => (
        <div
          key={i}
          className="w-11 shrink-0 overflow-hidden rounded-[3px] border border-white/15 bg-night ring-1 ring-night"
        >
          {it.customImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.customImage} alt={it.name} className="aspect-[856/540] w-full object-cover" />
          ) : it.theme ? (
            <CardVisual image={it.image} theme={it.theme} seed={it.handle} showChip={false} className="w-full" />
          ) : (
            <div className="aspect-[856/540] w-full bg-white/5" />
          )}
        </div>
      ))}
      {order.items.length > 4 && (
        <div className="flex w-11 shrink-0 items-center justify-center rounded-[3px] border border-white/15 bg-white/[0.04] text-[11px] font-semibold text-ivory-dim">
          +{order.items.length - 4}
        </div>
      )}
    </div>
  );
}

function Shipping({ order }: { order: Order }) {
  const c = order.customer;
  const a = c?.address;
  if (!c && !a) {
    return <span className="text-xs text-ivory-dim/50">Adresse via Stripe</span>;
  }
  const cityLine = [a?.postalCode, a?.city].filter(Boolean).join(" ");
  const full = [c?.name, a?.line1, a?.line2, cityLine, a?.country]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="min-w-0 text-xs" title={full || undefined}>
      {c?.name && <p className="truncate font-semibold text-ivory">{c.name}</p>}
      {cityLine && <p className="truncate text-ivory-dim">{cityLine}</p>}
      <p className="truncate text-ivory-dim/70">
        {a?.country ?? c?.email ?? "—"}
      </p>
    </div>
  );
}

function RowActions({ order }: { order: Order }) {
  if (order.payment === "pending") {
    return <span className="text-xs text-ivory-dim/60">Attend le paiement</span>;
  }
  if (order.payment === "failed" || order.payment === "expired") {
    return <span className="text-xs text-ivory-dim/50">Annulée</span>;
  }
  if (order.payment === "refunded") {
    return <span className="text-xs font-semibold text-violet-300/80">Remboursée</span>;
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {order.status === "new" && (
        <Link href={`/admin/print/batch?ids=${order.id}`} className={btnGhostSm}>
          Imprimer
        </Link>
      )}
      {order.status === "new" && (
        <form action={setOrderStatusAction.bind(null, order.id, "printed")}>
          <button className={btnGhostSm}>→ Imprimée</button>
        </form>
      )}
      {/* À partir de « imprimée » : saisie du n° de suivi au passage à expédiée,
          puis correction possible une fois expédiée. */}
      {(order.status === "printed" || order.status === "shipped") && (
        <ShipForm
          id={order.id}
          trackingNumber={order.trackingNumber}
          shipped={order.status === "shipped"}
        />
      )}
      <RefundButton id={order.id} amount={formatPrice(order.totals.total)} />
    </div>
  );
}

export function OrdersTable({
  orders,
  compact = false,
}: {
  orders: Order[];
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <th className={`px-4 py-3 ${label}`}>Commande</th>
            <th className={`px-4 py-3 ${label}`}>Articles</th>
            {!compact && <th className={`px-4 py-3 ${label}`}>Livraison</th>}
            <th className={`px-4 py-3 text-right ${label}`}>Total</th>
            <th className={`px-4 py-3 text-right ${label}`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.new;
            return (
              <tr
                key={o.id}
                className="border-b border-white/[0.06] align-top transition-colors last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[13px] font-semibold text-ivory">{o.id}</span>
                    <span className="text-xs text-ivory-dim/70">
                      {new Date(o.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge label={st.label} cls={st.cls} dot={st.dot} />
                      {o.payment !== "paid" && PAYMENT_STATUS[o.payment] && (
                        <Badge label={PAYMENT_STATUS[o.payment].label} cls={PAYMENT_STATUS[o.payment].cls} />
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <OrderThumbs order={o} />
                    <div className="max-w-xs text-xs text-ivory-dim">
                      {o.items.map((it, i) => (
                        <p key={i} className="truncate">
                          <span className="tabular-nums text-ivory-dim/90">{it.qty}×</span> {it.name}
                          {it.options?.Puce ? ` · puce ${it.options.Puce.toLowerCase()}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                </td>

                {!compact && (
                  <td className="px-4 py-4">
                    <Shipping order={o} />
                  </td>
                )}

                <td className="px-4 py-4 text-right">
                  <p className="font-semibold tabular-nums text-ivory">{formatPrice(o.totals.total)}</p>
                  <p className="mt-0.5 text-[11px] text-ivory-dim/60">
                    {o.totals.stickerUnits} sticker{o.totals.stickerUnits > 1 ? "s" : ""}
                  </p>
                </td>

                <td className="px-4 py-4 text-right">
                  <RowActions order={o} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
