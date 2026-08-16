// Throttle anti-abus en mémoire (zéro dépendance). Fenêtre glissante simple
// par clé (ex. email:ip). Limite : par instance de process — suffisant en
// mono-instance ; à migrer vers une table si scale horizontal un jour.
// NE PAS importer côté client.

interface Bucket {
  count: number;
  resetAt: number;
}

// Mémorisé sur globalThis pour survivre au hot-reload de Next en dev.
const globalForRl = globalThis as unknown as { _msRateLimit?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = globalForRl._msRateLimit ?? new Map();
if (process.env.NODE_ENV !== "production") globalForRl._msRateLimit = buckets;

/** Enregistre une tentative pour `key`. Renvoie `false` si le quota est dépassé
 * (dans la fenêtre), `true` sinon. */
export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000,
): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

/** Réinitialise le compteur d'une clé (ex. après une connexion réussie). */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
