// Store des propositions de designs issues de la veille (workflow
// veille-designs), adossé à Postgres (table proposals : statut promu + objet
// complet en JSONB). NE PAS importer côté client.

import { pool, ensureSchema } from "./db";
import type { Theme } from "./products";

export type ProposalStatus = "new" | "dismissed" | "created";

export interface Proposal {
  id: string;
  name: string;
  slug: string;
  pitch: string;
  audience: string;
  rationale: string;
  category: string;
  theme: Theme;
  /** artwork dessiné par le studio (chemin sous site/public) */
  image?: string;
  needsCustomArt: boolean;
  score: number;
  scoreDetail?: {
    vente: number;
    risque: number;
    avisVente: string;
    avisRisque: string;
  };
  sources: string[];
  status: ProposalStatus;
  createdAt: string;
}

export async function getProposals(): Promise<Proposal[]> {
  await ensureSchema();
  const { rows } = await pool.query(`SELECT data FROM proposals ORDER BY created_at DESC`);
  return rows.map((r) => r.data as Proposal);
}

export async function setProposalStatus(id: string, status: ProposalStatus): Promise<void> {
  await ensureSchema();
  await pool.query(
    `UPDATE proposals
       SET status = $2,
           data = jsonb_set(data, '{status}', to_jsonb($2::text))
       WHERE id = $1`,
    [id, status],
  );
}

/** Ajoute des propositions (import de la veille) — dédupliquées par id.
 * Renvoie le nombre réellement inséré. */
export async function addProposals(list: Proposal[]): Promise<number> {
  await ensureSchema();
  let added = 0;
  for (const p of list) {
    const { rowCount } = await pool.query(
      `INSERT INTO proposals (id, created_at, status, data) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
      [p.id, p.createdAt ?? new Date().toISOString(), p.status ?? "new", p],
    );
    added += rowCount ?? 0;
  }
  return added;
}
