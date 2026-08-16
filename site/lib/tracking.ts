// Suivi de colis — La Poste « lettre suivie » (seul mode d'envoi de la boutique,
// cf. checkout + email d'expédition). Module sans dépendance serveur : il peut
// être importé côté client (espace compte, page de suivi) comme côté admin.

/** Libellé du transporteur affiché dans les emails / le suivi. */
export const TRACKING_CARRIER = "La Poste — Lettre suivie";

/** URL publique de suivi La Poste pour un numéro de suivi donné. */
export function trackingUrl(trackingNumber: string): string {
  return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(
    trackingNumber.trim(),
  )}`;
}
