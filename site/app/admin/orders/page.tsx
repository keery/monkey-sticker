import Link from "next/link";
import { getOrders, flattenPrintUnits, type Order } from "@/lib/orders";
import { PER_SHEET } from "@/lib/print-layout";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { PageHeader, EmptyState } from "@/components/admin/AdminUI";
import { btnPrimary } from "@/lib/admin-ui";

export const dynamic = "force-dynamic";

type FilterKey = "all" | "to-print" | "printed" | "shipped" | "unpaid";

const MATCH: Record<FilterKey, (o: Order) => boolean> = {
  all: () => true,
  "to-print": (o) => o.status === "new" && o.payment === "paid",
  printed: (o) => o.status === "printed",
  shipped: (o) => o.status === "shipped",
  unpaid: (o) => o.payment === "pending",
};

const TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "to-print", label: "À imprimer" },
  { key: "printed", label: "Imprimées" },
  { key: "shipped", label: "Expédiées" },
  { key: "unpaid", label: "Paiement en attente" },
];

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const sp = await props.searchParams;
  const active: FilterKey =
    typeof sp.f === "string" && sp.f in MATCH ? (sp.f as FilterKey) : "all";

  const orders = (await getOrders())
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const pending = orders.filter(MATCH["to-print"]);
  const pendingUnits = flattenPrintUnits(pending).length;
  const sheets = Math.ceil(pendingUnits / PER_SHEET);

  const shown = orders.filter(MATCH[active]);

  return (
    <div>
      <PageHeader
        title="Commandes"
        sub={
          pending.length > 0
            ? `${pending.length} à imprimer, soit ${pendingUnits} sticker${pendingUnits > 1 ? "s" : ""} sur ${sheets} feuille${sheets > 1 ? "s" : ""} A4.`
            : "Aucune commande en attente d'impression."
        }
        actions={
          pendingUnits > 0 && (
            <Link href="/admin/print/batch" className={btnPrimary}>
              Feuilles d&apos;impression ({sheets})
            </Link>
          )
        }
      />

      {/* Filtres de statut */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = orders.filter(MATCH[t.key]).length;
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/orders" : `/admin/orders?f=${t.key}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-flame text-night"
                  : "border border-white/12 text-ivory-dim hover:border-white/25 hover:text-ivory"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                  isActive ? "bg-night/20 text-night" : "bg-white/[0.07] text-ivory-dim"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {shown.length > 0 ? (
        <OrdersTable orders={shown} />
      ) : orders.length === 0 ? (
        <EmptyState title="Aucune commande pour l'instant">
          Passe une commande test depuis la boutique : ajoute un sticker au panier, puis
          Commander. Elle apparaîtra ici dès le paiement confirmé.
        </EmptyState>
      ) : (
        <EmptyState title="Rien dans ce filtre">
          Aucune commande ne correspond à « {TABS.find((t) => t.key === active)?.label} ».
        </EmptyState>
      )}
    </div>
  );
}
