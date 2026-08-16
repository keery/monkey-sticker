# Paiement Stripe — mise en route

Tout le code du tunnel de paiement est en place. Il ne reste qu'à brancher un
compte Stripe. Voici la marche à suivre.

## 1. Créer le compte et récupérer les clés

1. Crée un compte sur [dashboard.stripe.com](https://dashboard.stripe.com).
2. Reste en **mode test** (interrupteur en haut à droite) tant que tu valides.
3. **Développeurs → Clés API** : copie la **clé secrète** `sk_test_…`.

## 2. Configurer `.env.local`

```bash
cd site
cp .env.local.example .env.local
```

Renseigne dans `.env.local` :

| Variable | Où la trouver |
|---|---|
| `STRIPE_SECRET_KEY` | Développeurs → Clés API (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | voir étape 3 (`whsec_…`) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3022` en local |
| `STRIPE_SHIPPING_CENTS` | frais de port en centimes, `0` = offert |

Redémarre `npm run dev` après chaque modification du fichier.

## 3. Recevoir les webhooks en local

Le webhook confirme le paiement et fait passer la commande en « à imprimer ».
Sans lui, le paiement aboutit mais la commande reste en attente.

```bash
# une fois : installe la CLI (macOS)
brew install stripe/stripe-cli/stripe
stripe login

# à chaque session de dev, dans un terminal à part :
stripe listen --forward-to localhost:3022/api/stripe/webhook
```

La commande affiche `whsec_…` : colle-le dans `STRIPE_WEBHOOK_SECRET`.

## 4. Tester

1. Ajoute un sticker au panier, clique **Commander**.
2. Sur la page Stripe, paie avec la carte de test `4242 4242 4242 4242`,
   date future, CVC quelconque.
3. Retour sur `/checkout/success` : le panier se vide, le numéro de commande
   s'affiche.
4. La commande apparaît dans **/admin/orders** avec le badge « Payée ».

Autres cartes de test : Stripe → [Cartes de test](https://stripe.com/docs/testing).

## 5. Passer en production

1. **Active ton compte** (Stripe → Activer : SIRET, IBAN, identité).
2. Bascule les clés sur `sk_live_…` dans l'environnement de prod (jamais dans le
   dépôt).
3. **Développeurs → Webhooks → Ajouter un endpoint** :
   `https://<ton-domaine>/api/stripe/webhook`, événement
   `checkout.session.completed`. Copie le nouveau `whsec_…` de production.
4. Renseigne `NEXT_PUBLIC_SITE_URL=https://<ton-domaine>`.
5. Vérifie que **CGV, mentions légales, politique de retour** sont complètes
   (obligation légale FR + exigence Stripe) — aujourd'hui ce sont des
   placeholders dans `app/pages/[slug]`.
6. Protège **/admin** par une authentification avant d'exposer de vraies
   adresses clients.

## Ce qui est déjà codé

- Recalcul des prix **côté serveur** depuis le catalogue (le navigateur ne peut
  pas fixer un prix) et remise BOGO recalculée serveur — `lib/checkout.ts`.
- Création de la session Stripe Checkout (CB, Apple Pay, Google Pay), collecte
  de l'adresse de livraison.
- Commande enregistrée **en attente** avant redirection, passée **payée** par le
  webhook — `lib/orders.ts`, `app/api/stripe/webhook/route.ts`.
- Pages `/checkout/success` et `/checkout/cancel`.
- L'admin ne montre en file d'impression que les commandes payées.
