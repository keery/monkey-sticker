<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Le bloc ci-dessus est géré par `next dev` ; tout ce qui suit est préservé
     (next ne réécrit que l'intérieur des marqueurs BEGIN/END). -->

# Traductions — OBLIGATOIRE

Le storefront est internationalisé en **6 langues : `en` (défaut), `fr`, `es`, `de`, `nl`, `pt`**.
**Dès que tu ajoutes ou modifies du texte visible par l'utilisateur, tu le fais dans les 6 langues — jamais une seule.** Ne laisse jamais de chaîne codée en dur dans le JSX.

## Règles
- **Chaînes d'UI** → dictionnaires `lib/i18n/dictionaries/{en,fr,es,de,nl,pt}.json`, avec des clés **identiques dans les 6 fichiers** (même structure, mêmes longueurs de tableaux, mêmes sous-clés de pluriel `one`/`other`). L'anglais est la source de structure (le type `Dictionary` en dérive).
  - Composant client (`"use client"`) : `const { dict, locale } = useI18n()` → `dict.<ns>.<clé>`.
  - Composant serveur / page : `const dict = await getDictionary(locale)` (locale depuis `params.lang`, ou `next/root-params`).
  - Variables : `interpolate(dict…, { var })` ; pluriels : `plural(locale, n, dict…, { count })`.
- **Liens internes** : `<LocaleLink href="/…">` (jamais `<Link>` de `next/link` nu).
- **Prix** : `formatPrice(montant, locale)`.
- **Contenu catalogue** (noms/descriptions produits, titres catégories) : langue de base = **français** (champs racine) ; les autres langues vont dans `product.i18n[locale]` / `category.i18n[locale]` ; lecture via `localizedProduct` / `localizedCategory` (`lib/i18n/catalog.ts`). Éditable dans l'admin (onglets langue).
- **Titre / description de page** : `generateMetadata` qui lit le dict (pas de `export const metadata` statique en dur).
- Après ajout de clés, **vérifie la parité** : les 6 fichiers doivent avoir exactement les mêmes clés (script rapide : comparer les feuilles de chaque fichier à `en.json`).

## Exceptions
- Le **back-office `/admin`** reste **en français uniquement** — ne pas traduire.
- Si tu ne peux pas produire une des 6 langues, remplis au moins `en` + `fr` (le repli sur l'anglais est automatique via `get-dictionary.ts`) mais **signale-le** ; jamais de clé manquante silencieuse.

Architecture i18n : `proxy.ts` (détection + routage), `app/[lang]/`, `lib/i18n/`. Détails et décisions : mémoire projet `i18n-monkey-sticker`.
