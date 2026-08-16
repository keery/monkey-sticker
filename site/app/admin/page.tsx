import Link from "next/link";
import { getOrders, flattenPrintUnits } from "@/lib/orders";
import { getCatalog } from "@/lib/catalog";
import { getSubscribers } from "@/lib/newsletter";
import { getProposals } from "@/lib/proposals";
import { formatPrice } from "@/lib/format";
import { PER_SHEET } from "@/lib/print-layout";
import { DesignThumb } from "@/components/admin/DesignThumb";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { PageHeader, MetricStrip, Metric } from "@/components/admin/AdminUI";
import { panel, btnPrimary, btnGhostSm, label } from "@/lib/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [orders, catalog, subs, proposals] = await Promise.all([
    getOrders(),
    getCatalog(),
    getSubscribers(),
    getProposals(),
  ]);

  const paid = orders.filter((o) => o.payment === "paid");
  const pending = paid.filter((o) => o.status === "new");
  const pendingUnits = flattenPrintUnits(pending).length;
  const sheets = Math.ceil(pendingUnits / PER_SHEET);
  const awaitingPayment = orders.filter((o) => o.payment === "pending").length;
  const revenue = paid.reduce((s, o) => s + o.totals.total, 0);

  const stickers = catalog.products.filter((p) => p.kind === "sticker");
  const freshIdeas = proposals
    .filter((p) => p.status === "new")
    .sort((a, b) => b.score - a.score);

  const recent = orders
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Vue d'ensemble"
        sub="Ce qu'il y a à traiter, en un coup d'œil."
        actions={
          pendingUnits > 0 && (
            <Link href="/admin/print/batch" className={btnPrimary}>
              Imprimer {sheets} feuille{sheets > 1 ? "s" : ""}
            </Link>
          )
        }
      />

      <MetricStrip>
        <Metric
          label="À imprimer"
          value={pending.length}
          hint={`${pendingUnits} sticker${pendingUnits > 1 ? "s" : ""} · ${sheets} A4`}
          accent={pending.length > 0}
        />
        <Metric
          label="Encaissé"
          value={formatPrice(revenue)}
          hint={`${paid.length} commande${paid.length > 1 ? "s" : ""} payée${paid.length > 1 ? "s" : ""}`}
        />
        <Metric
          label="Paiement en attente"
          value={awaitingPayment}
          hint={awaitingPayment > 0 ? "à surveiller" : "rien en suspens"}
        />
        <Metric label="Designs" value={stickers.length} hint={`${catalog.categories.length} catégories`} />
        <Metric label="Inscrits" value={subs.length} hint="newsletter" />
        <Metric
          label="Idées"
          value={freshIdeas.length}
          hint="proposées par la veille"
          accent={freshIdeas.length > 0}
        />
      </MetricStrip>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          {/* File d'impression : l'action n°1 de l'atelier */}
          {pendingUnits > 0 ? (
            <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-flame/25 bg-flame/[0.06] p-6">
              <div className="flex-1 min-w-56">
                <p className={label}>File d'impression</p>
                <p className="mt-2 text-2xl font-semibold text-ivory">
                  {pending.length} commande{pending.length > 1 ? "s" : ""} prête
                  {pending.length > 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-sm text-ivory-dim">
                  {pendingUnits} sticker{pendingUnits > 1 ? "s" : ""} à découper, soit{" "}
                  {sheets} feuille{sheets > 1 ? "s" : ""} A4 ({PER_SHEET}/feuille).
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link href="/admin/print/batch" className={btnPrimary}>
                  Ouvrir les feuilles
                </Link>
                <Link href="/admin/orders?f=to-print" className={`${btnGhostSm} justify-center`}>
                  Voir les commandes
                </Link>
              </div>
            </div>
          ) : (
            <div className={`${panel} p-6`}>
              <p className={label}>File d'impression</p>
              <p className="mt-2 text-lg font-semibold text-ivory">Tout est imprimé.</p>
              <p className="mt-1 text-sm text-ivory-dim">
                Aucune commande payée n'attend la découpe. Beau travail.
              </p>
            </div>
          )}

          {/* Commandes récentes */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">
                Dernières commandes
              </h2>
              <Link href="/admin/orders" className="text-xs font-semibold text-flame hover:text-flame-deep">
                Toutes les commandes →
              </Link>
            </div>
            {recent.length > 0 ? (
              <OrdersTable orders={recent} compact />
            ) : (
              <div className={`${panel} px-6 py-10 text-center text-sm text-ivory-dim`}>
                Aucune commande pour l'instant. Passe une commande test depuis la boutique.
              </div>
            )}
          </section>
        </div>

        {/* Colonne latérale : idées + catalogue */}
        <div className="flex flex-col gap-5">
          <section className={`${panel} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">
                Idées en attente
              </h2>
              {freshIdeas.length > 0 && (
                <Link href="/admin/ideas" className="text-xs font-semibold text-flame hover:text-flame-deep">
                  Voir tout →
                </Link>
              )}
            </div>
            {freshIdeas.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {freshIdeas.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <DesignThumb image={p.image} theme={p.theme} seed={p.slug} name={p.name} className="w-14 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ivory">{p.name}</p>
                      <p className="truncate text-xs text-ivory-dim">{p.category}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-bold tabular-nums text-ivory">
                      {p.score}/10
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ivory-dim">
                Boîte vide. Demande « lance la veille designs » à Claude pour la remplir.
              </p>
            )}
          </section>

          <section className={`${panel} p-5`}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">
              Catalogue
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/admin/designs" className="flex items-center justify-between rounded-lg px-3 py-2.5 text-ivory transition-colors hover:bg-white/[0.05]">
                <span>Designs</span>
                <span className="tabular-nums text-ivory-dim">{stickers.length}</span>
              </Link>
              <Link href="/admin/categories" className="flex items-center justify-between rounded-lg px-3 py-2.5 text-ivory transition-colors hover:bg-white/[0.05]">
                <span>Catégories</span>
                <span className="tabular-nums text-ivory-dim">{catalog.categories.length}</span>
              </Link>
              <Link href="/admin/designs/new" className="flex items-center justify-between rounded-lg px-3 py-2.5 text-flame transition-colors hover:bg-flame/[0.08]">
                <span>+ Nouveau design</span>
                <span aria-hidden>→</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
