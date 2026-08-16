// Client Stripe côté serveur (singleton paresseux). NE JAMAIS importer depuis
// un composant client : la clé secrète ne doit jamais atteindre le navigateur.
//
// Config attendue dans .env.local (voir .env.local.example) :
//   STRIPE_SECRET_KEY       clé secrète (sk_test_… puis sk_live_…)
//     (alias accepté : STRIPE_PRIVATE_KEY — même valeur, autre convention de nom)
//   STRIPE_WEBHOOK_SECRET   secret de signature du webhook (whsec_…) — optionnel
//                           en local : la page /checkout/success confirme aussi
//                           le paiement en revérifiant la session côté serveur.
//   NEXT_PUBLIC_SITE_URL    URL publique du site (fallback si l'origine de la
//                           requête est indisponible) — ex. https://monkeysticker.fr

import Stripe from "stripe";

/** Clé secrète, quel que soit le nom retenu dans l'environnement. On accepte
 * STRIPE_SECRET_KEY (convention Stripe/docs) et STRIPE_PRIVATE_KEY (alias). */
function secretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_PRIVATE_KEY;
}

/** Vrai dès que la clé secrète est présente. Le tunnel de paiement s'appuie
 * dessus pour afficher un message clair tant que le compte n'est pas branché. */
export function isStripeConfigured(): boolean {
  return Boolean(secretKey());
}

let client: Stripe | null = null;

/** Renvoie le client Stripe, ou lève une erreur explicite si la clé manque.
 * On ne fixe pas `apiVersion` : le SDK utilise sa version épinglée par défaut. */
export function getStripe(): Stripe {
  const key = secretKey();
  if (!key) {
    throw new Error(
      "Clé secrète Stripe manquante : ajoute STRIPE_SECRET_KEY (ou STRIPE_PRIVATE_KEY) dans site/.env.local (voir .env.local.example).",
    );
  }
  if (!client) {
    client = new Stripe(key, {
      appInfo: { name: "Monkey Sticker", url: "https://monkeysticker.fr" },
    });
  }
  return client;
}

/** Devise du compte (une seule pour l'instant). */
export const CURRENCY = "eur";
