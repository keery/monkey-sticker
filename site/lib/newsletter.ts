// Store des inscriptions newsletter, adossé à Postgres (table
// newsletter_subscribers). NE PAS importer côté client.

import { pool, ensureSchema } from "./db";

export interface Subscriber {
  email: string;
  /** d'où vient l'inscription (home, footer…) */
  source: string;
  createdAt: string;
}

export async function getSubscribers(): Promise<Subscriber[]> {
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT email, source, created_at
       FROM newsletter_subscribers
       ORDER BY created_at DESC`,
  );
  return rows.map((r) => ({
    email: r.email as string,
    source: r.source as string,
    createdAt: (r.created_at as Date).toISOString(),
  }));
}

/** Ajoute un email (normalisé, dédupliqué au niveau base via l'index UNIQUE). */
export async function addSubscriber(
  email: string,
  source: string,
): Promise<"added" | "exists"> {
  await ensureSchema();
  const normalized = email.trim().toLowerCase();
  const { rowCount } = await pool.query(
    `INSERT INTO newsletter_subscribers (email, source)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
    [normalized, source],
  );
  return rowCount === 1 ? "added" : "exists";
}
