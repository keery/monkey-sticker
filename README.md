<div align="center">

<img src=".github/banner.png" alt="Monkey Sticker — stickers format carte bancaire" width="840">

<br>

**Des stickers vinyle découpés aux cotes exactes de la carte bancaire — fenêtre puce dégagée au dixième de millimètre.**
De la boutique en ligne jusqu'au fichier de découpe : la chaîne complète, dans un seul dépôt.

<br>

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-0B1120?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)

<br>

**[🛍️ Boutique](./site)** · **[✂️ Générateur de découpe](./cardcut)** · **[📄 Brief produit](./PRODUCT.md)**

</div>

---

## En bref

**Monkey Sticker** transforme l'objet qu'on sort dix fois par jour — sa carte bancaire — en accessoire de style. Un sticker vinyle découpé **au format ISO ID-1 exact** (85,60 × 53,98 mm), avec une **fenêtre ajourée pile sur la puce EMV** pour ne jamais la couvrir. 40+ designs prêts à poser, ou sa propre création.

Ce dépôt réunit **les deux moitiés du produit** :

| Brique | Rôle | Stack |
| :-- | :-- | :-- |
| 🛍️ **[`site/`](./site)** | La boutique : vitrine, panier, paiement, comptes clients et back-office. | Next.js 16 · React 19 · PostgreSQL · Stripe |
| ✂️ **[`cardcut/`](./cardcut)** | L'atelier : génère les fichiers de découpe (die-lines) envoyés à la machine ou à l'imprimeur. | Python 3.13 · SVG / PDF « maison » |

> La précision de découpe **est** l'argument de vente : montrer l'artisanat technique est la meilleure preuve de qualité pour une marque jeune.

---

## 🛍️ La boutique — `site/`

Un storefront e-commerce sombre et soigné — *« une vitrine de nuit, pas un dashboard »* — pensé mobile-first pour un achat impulsif.

- 🌍 **Internationalisée en 6 langues** (`en` · `fr` · `es` · `de` · `nl` · `pt`) — détection et routage via `proxy.ts`, dictionnaires typés.
- 🎨 **Customizer aux cotes réelles** — l'artwork est cadré exactement sur la die-line de `cardcut` : ce que l'on voit est ce qui sera imprimé (WYSIWYG aperçu → vitrine → impression).
- 🎁 **Offre BOGO** (1 acheté = 1 offert), dite une fois, sans fausse urgence ni pop-up.
- 💳 **Paiement Stripe** (Checkout hébergé) — webhook optionnel, la page de succès reconfirme la commande côté serveur.
- 👤 **Comptes clients** — authentification maison (scrypt + sessions Postgres), espace `/account` : commandes, **suivi La Poste**, re-commande en un clic.
- 🛠️ **Back-office `/admin`** (en français) — catalogue, commandes, propositions custom, newsletter, **éditeur d'artwork non destructif** (échelle / position / rotation) et **prévisualisation des e-mails**.
- ✉️ **E-mails transactionnels** maison (API HTTP Resend, zéro dépendance) avec dégradation propre en dev.
- 🗄️ **PostgreSQL comme source de vérité unique** — catalogue, commandes, propositions, newsletter et comptes. Docker en local (port `5434`), base managée en prod.

### Démarrage

```bash
cd site
cp .env.local.example .env.local     # renseigne DATABASE_URL + tes clés Stripe (sk_test_…)
docker compose up -d                 # Postgres local sur le port 5434
npm install
npm run db:import                    # importe le seed du catalogue en base
npm run dev                          # → http://localhost:3022
```

> Détails paiement : [`site/STRIPE.md`](./site/STRIPE.md) · conventions & i18n : [`site/AGENTS.md`](./site/AGENTS.md)

---

## ✂️ Le générateur de découpe — `cardcut/`

Un outil Python qui produit les **die-lines** : le contour au format carte + la fenêtre découpée à l'emplacement des contacts de la puce. Deux voies de production couvertes.

| Voie | Machine / prestataire | Fichier généré |
| :-- | :-- | :-- |
| **A — Maison** *(recommandée)* | Silhouette Cameo 5 (kiss-cut print & cut) | `sheet_a4_silhouette.svg` |
| **B — Sous-traitance** | StickerApp (fenêtres intérieures acceptées) | `final_stickerapp.pdf` (ton direct `CutContour`) |

```bash
python3.13 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m cardcut all       # génère tout dans out/ + auto-contrôle
.venv/bin/python -m cardcut fittest    # PDF A4 : 6 variantes de fenêtre à tester
```

Tout est en millimètres en interne, `geometry.py` est la source unique des tracés, et les fichiers PDF sont écrits sans compression pour que `selfcheck.py` valide les octets (`/Separation`, `/CutContour`, MediaBox…) sans parseur externe.

> **📖 Guide complet** (cotes ISO validées, procédure fit-test, réglages kiss-cut, pièges connus) : **[`cardcut/README.md`](./cardcut/README.md)**

---

## 🧱 Stack technique

| Domaine | Technologies |
| :-- | :-- |
| **Frontend** | Next.js 16 (App Router, Server Actions), React 19, TypeScript 5, Tailwind CSS 4 |
| **Données & paiement** | PostgreSQL (`pg`), Stripe |
| **Internationalisation** | 6 langues, dictionnaires typés, routage `proxy.ts` |
| **Rendu d'impression** | Génération PDF de production (Playwright headless) |
| **Découpe** | Python 3.13, writers SVG/PDF sans dépendance, Pillow (voie B) |
| **Outillage** | Docker (Postgres), ESLint 9 |

---

## 📁 Structure du dépôt

```
sticker-credit-card/
├─ site/              🛍️  Boutique Next.js (storefront + admin + API)
│  ├─ app/            #   [lang]/ vitrine i18n · admin/ back-office · api/
│  ├─ lib/            #   auth · checkout · stripe · catalog · orders · emails · print…
│  ├─ db/             #   schéma & accès PostgreSQL
│  ├─ data/           #   seed du catalogue (état initial)
│  └─ tests/          #   tests bout-en-bout
├─ cardcut/           ✂️  Générateur de die-lines (Python) + guide complet
├─ presets.toml       #   cotes & variantes de fenêtre validées
├─ PRODUCT.md         #   brief produit & direction de marque
└─ .github/           #   assets (bannière)
```

---

## 🎨 Direction artistique

Trois mots portent la marque : **vitrine de nuit · bijou · précis.**

1. **La carte est le bijou.** Chaque section met en scène le produit sous une lumière de galerie.
2. **Le noir est une vitrine, pas un dashboard.** Fond sombre teinté chaud, halos doux ; la couleur vient des designs.
3. **La précision vend.** Cotes exactes et découpe puce comme preuve d'artisanat.
4. **Le mouvement est de la lumière.** Reflets et révélations, jamais d'urgence animée.
5. **Une offre, dite une fois.** Le BOGO s'affirme calmement.

Accessibilité : contrastes **WCAG AA**, `prefers-reduced-motion` respecté partout, parcours d'achat complet au clavier. → détails dans [`PRODUCT.md`](./PRODUCT.md).

---

## 📄 Licence

Projet **propriétaire** — © 2026 Monkey Sticker. Tous droits réservés. Code source privé, non destiné à la redistribution.

<div align="center"><sub>Fait avec ☕ et un pied à coulisse.</sub></div>
