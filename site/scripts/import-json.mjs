// Migration / synchronisation des anciens fichiers data/*.json vers Postgres.
//
// Usage :
//   node scripts/import-json.mjs            # importe catalog + orders + proposals
//   node scripts/import-json.mjs proposals  # un seul store (catalog | orders | proposals)
//
// Idempotent : ré-exécutable sans doublon (upsert par clé). Sert aussi de
// passerelle pour la veille designs (après écriture de data/proposals.json,
// `npm run db:import proposals` pousse les nouvelles idées en base).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, "..");
const DATA = path.join(ROOT, "data");

const CONNECTION_STRING =
  process.env.DATABASE_URL ?? "postgres://flapy:flapy@localhost:5434/flapy";

function sslConfig() {
  if (process.env.PGSSL === "disable") return false;
  if (process.env.PGSSL === "require") return { rejectUnauthorized: false };
  try {
    const host = new URL(CONNECTION_STRING).hostname;
    const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
    return local ? false : { rejectUnauthorized: false };
  } catch {
    return false;
  }
}

const pool = new Pool({ connectionString: CONNECTION_STRING, ssl: sslConfig() });

async function readJson(name) {
  try {
    return JSON.parse(await readFile(path.join(DATA, name), "utf-8"));
  } catch {
    return null;
  }
}

async function ensureSchema() {
  const sql = await readFile(path.join(ROOT, "db", "init", "01-schema.sql"), "utf-8");
  await pool.query(sql);
}

async function importCatalog() {
  const catalog = await readJson("catalog.json");
  if (!catalog) return "catalog.json absent — ignoré";
  let cats = 0;
  for (const c of catalog.categories ?? []) {
    await pool.query(
      `INSERT INTO categories (handle, data) VALUES ($1, $2)
         ON CONFLICT (handle) DO UPDATE SET data = EXCLUDED.data`,
      [c.handle, c],
    );
    cats++;
  }
  let prods = 0;
  for (const p of catalog.products ?? []) {
    await pool.query(
      `INSERT INTO products (handle, data) VALUES ($1, $2)
         ON CONFLICT (handle) DO UPDATE SET data = EXCLUDED.data`,
      [p.handle, p],
    );
    prods++;
  }
  return `catalog : ${cats} catégories, ${prods} produits`;
}

async function importOrders() {
  const orders = await readJson("orders.json");
  if (!orders) return "orders.json absent — ignoré";
  let n = 0;
  let maxNum = 10000;
  for (const o of orders) {
    await pool.query(
      `INSERT INTO orders (id, created_at, stripe_session_id, data) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data,
           stripe_session_id = EXCLUDED.stripe_session_id`,
      [o.id, o.createdAt ?? new Date().toISOString(), o.stripeSessionId ?? null, o],
    );
    n++;
    const num = Number(String(o.id).replace(/^MS-/, ""));
    if (Number.isFinite(num)) maxNum = Math.max(maxNum, num);
  }
  // aligne la séquence de numérotation au-delà des id importés
  await pool.query(`SELECT setval('order_number_seq', $1, true)`, [maxNum]);
  return `orders : ${n} commandes (séquence alignée sur ${maxNum})`;
}

async function importProposals() {
  const proposals = await readJson("proposals.json");
  if (!proposals) return "proposals.json absent — ignoré";
  // DO NOTHING : ne jamais écraser une proposition déjà en base — l'admin a pu
  // la traiter (dismissed / created) et son statut ne doit pas repartir à « new ».
  let added = 0;
  for (const p of proposals) {
    const { rowCount } = await pool.query(
      `INSERT INTO proposals (id, created_at, status, data) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
      [p.id, p.createdAt ?? new Date().toISOString(), p.status ?? "new", p],
    );
    added += rowCount ?? 0;
  }
  return `proposals : ${added} nouvelles idées (sur ${proposals.length})`;
}

const JOBS = { catalog: importCatalog, orders: importOrders, proposals: importProposals };

async function main() {
  const which = process.argv[2];
  const jobs = which ? [which] : Object.keys(JOBS);
  await ensureSchema();
  for (const job of jobs) {
    if (!JOBS[job]) {
      console.error(`Store inconnu : ${job} (attendu : catalog | orders | proposals)`);
      process.exitCode = 1;
      continue;
    }
    console.log("✓", await JOBS[job]());
  }
  await pool.end();
}

main().catch((err) => {
  console.error("Échec import :", err.message);
  process.exit(1);
});
