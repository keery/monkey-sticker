import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getProposals, type Proposal } from "@/lib/proposals";
import { DismissButton, RestoreButton } from "@/components/admin/ProposalActions";
import { DesignThumb } from "@/components/admin/DesignThumb";
import { PageHeader, EmptyState, Badge } from "@/components/admin/AdminUI";
import { panel, btnPrimary, chip } from "@/lib/admin-ui";

export const dynamic = "force-dynamic";

function createHref(p: Proposal): string {
  const params = new URLSearchParams({
    name: p.name,
    pattern: p.theme.pattern,
    c1: p.theme.colors[0],
    c2: p.theme.colors[1],
    pid: p.id,
    description: p.pitch,
  });
  if (p.theme.colors[2]) params.set("c3", p.theme.colors[2]);
  if (p.theme.dark) params.set("dark", "1");
  if (p.image) params.set("img", p.image);
  return `/admin/designs/new?${params.toString()}`;
}

function ProposalCard({ p }: { p: Proposal }) {
  return (
    <li className={`${panel} flex flex-col gap-3 p-5`}>
      <div className="flex items-start gap-4">
        <DesignThumb image={p.image} theme={p.theme} seed={p.slug} name={p.name} className="w-28 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ivory">{p.name}</p>
            <span className="rounded-full bg-flame px-2 py-0.5 text-[10px] font-bold tabular-nums text-night">
              {p.score}/10
            </span>
            <span className={chip}>{p.category}</span>
            {p.needsCustomArt && (
              <Badge label="Artwork dédié conseillé" cls="border-amber-400/25 bg-amber-400/10 text-amber-300" />
            )}
          </div>
          <p className="mt-1.5 text-sm text-ivory-dim">{p.pitch}</p>
          <p className="mt-1 text-xs text-ivory-dim/70">
            <span className="font-semibold text-ivory-dim">Cible :</span> {p.audience}
          </p>
        </div>
      </div>

      <details className="text-xs text-ivory-dim">
        <summary className="cursor-pointer font-semibold text-ivory-dim/80 transition-colors hover:text-ivory">
          Pourquoi ça peut vendre : analyse des juges
        </summary>
        <div className="mt-2 space-y-1.5 pl-1">
          <p>{p.rationale}</p>
          {p.scoreDetail && (
            <>
              <p>
                <span className="font-semibold text-ivory-dim">Juge vente ({p.scoreDetail.vente}/10) :</span>{" "}
                {p.scoreDetail.avisVente}
              </p>
              <p>
                <span className="font-semibold text-ivory-dim">Juge risques ({p.scoreDetail.risque}/10) :</span>{" "}
                {p.scoreDetail.avisRisque}
              </p>
            </>
          )}
          {p.sources.length > 0 && (
            <p className="flex flex-wrap gap-x-3">
              {p.sources.slice(0, 4).map((s, i) => (
                <a key={i} href={s} target="_blank" rel="noreferrer" className="max-w-60 truncate text-flame underline">
                  source {i + 1}
                </a>
              ))}
            </p>
          )}
        </div>
      </details>

      <div className="mt-auto flex items-center gap-2">
        <Link href={createHref(p)} className={btnPrimary}>
          Créer le design
        </Link>
        <DismissButton id={p.id} />
        <span className="ml-auto text-[10px] text-ivory-dim/60">
          {new Date(p.createdAt).toLocaleDateString("fr-FR")}
        </span>
      </div>
    </li>
  );
}

export default async function AdminIdeasPage() {
  await requireAdmin();
  const proposals = await getProposals();
  const fresh = proposals.filter((p) => p.status === "new").sort((a, b) => b.score - a.score);
  const processed = proposals.filter((p) => p.status !== "new");

  return (
    <div>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            Idées de la veille
            {fresh.length > 0 && (
              <span className="rounded-full bg-flame px-2.5 py-1 text-xs font-bold tabular-nums text-night">
                {fresh.length}
              </span>
            )}
          </span>
        }
        sub={
          <>
            Propositions trouvées par l&apos;équipe d&apos;agents. Pour en relancer une, demande
            « lance la veille designs » à Claude (option <code className="font-mono text-ivory">focus</code> sur un thème).
          </>
        }
      />

      {fresh.length === 0 ? (
        <EmptyState title="Aucune idée en attente">
          Lance la veille pour remplir cette boîte : « lance la veille designs ».
        </EmptyState>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {fresh.map((p) => (
            <ProposalCard key={p.id} p={p} />
          ))}
        </ul>
      )}

      {processed.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-semibold text-ivory-dim transition-colors hover:text-ivory">
            Traitées ({processed.length})
          </summary>
          <ul className="mt-4 space-y-2">
            {processed.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-ivory-dim"
              >
                <DesignThumb image={p.image} theme={p.theme} seed={p.slug} name={p.name} className="w-12 shrink-0 opacity-70" />
                <span className="font-semibold text-ivory">{p.name}</span>
                {p.status === "created" ? (
                  <Badge label="Design créé" cls="border-emerald-400/25 bg-emerald-400/10 text-emerald-300" />
                ) : (
                  <span className={chip}>Écartée</span>
                )}
                <span className="ml-auto flex items-center gap-2">
                  {p.status === "dismissed" && <RestoreButton id={p.id} />}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
