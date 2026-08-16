import { getSubscribers } from "@/lib/newsletter";
import { PageHeader, EmptyState } from "@/components/admin/AdminUI";
import { btnPrimary, chip, label } from "@/lib/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const subs = (await getSubscribers())
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const bySource = subs.reduce<Record<string, number>>((acc, s) => {
    acc[s.source] = (acc[s.source] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Newsletter"
        sub={`${subs.length} inscrit${subs.length > 1 ? "s" : ""} au total.`}
        actions={
          subs.length > 0 && (
            <a href="/admin/newsletter/export" className={btnPrimary} download>
              Exporter en CSV
            </a>
          )
        }
      />

      {subs.length === 0 ? (
        <EmptyState title="Aucune inscription pour l'instant">
          Teste depuis la boutique : pied de page, « Ton e-mail », puis S&apos;inscrire.
        </EmptyState>
      ) : (
        <>
          {Object.keys(bySource).length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className={label}>Sources</span>
              {Object.entries(bySource)
                .sort((a, b) => b[1] - a[1])
                .map(([s, n]) => (
                  <span key={s} className={chip}>
                    {s} <span className="font-bold tabular-nums text-ivory">{n}</span>
                  </span>
                ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className={`px-4 py-3 ${label}`}>E-mail</th>
                  <th className={`px-4 py-3 ${label}`}>Source</th>
                  <th className={`px-4 py-3 text-right ${label}`}>Inscription</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr
                    key={s.email}
                    className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium text-ivory">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className={chip}>{s.source}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-ivory-dim">
                      {new Date(s.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
