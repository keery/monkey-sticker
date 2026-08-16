"use server";

// Server Action newsletter : validation + enregistrement dans le store.

import { addSubscriber } from "./newsletter";

export interface SubscribeResult {
  ok: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function subscribeAction(
  email: string,
  source: string,
): Promise<SubscribeResult> {
  const normalized = (email ?? "").trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_RE.test(normalized)) {
    return { ok: false, error: "Cette adresse e-mail ne semble pas valide." };
  }
  try {
    // "exists" est traité comme un succès : pas la peine de le signaler.
    await addSubscriber(normalized, source);
    return { ok: true };
  } catch {
    return { ok: false, error: "Une erreur est survenue, réessaie dans un instant." };
  }
}
