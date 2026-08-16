# Pages légales Royaume-Uni Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer les placeholders légaux par trois pages françaises prêtes à compléter pour une entreprise établie au Royaume-Uni.

**Architecture:** Les contenus restent dans la route statique existante `site/app/pages/[slug]/page.tsx`, avec une structure par sections qui permet les titres, listes et encadrés de champs à compléter. La route dynamique existante conserve sa génération statique ; le pied de page expose la politique de retours dédiée.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS et Node.js test runner.

---

### Task 1: Écrire le test de contenu attendu

**Files:**
- Create: `site/tests/legal-pages.test.mjs`
- Test: `site/tests/legal-pages.test.mjs`

**Step 1: Write the failing test**

Créer un test Node qui lit `site/app/pages/[slug]/page.tsx` et vérifie les trois slugs (`cgv`, `mentions-legales`, `politique-de-retour`), les rubriques à compléter et les mentions de droit anglais / délai de rétractation.

**Step 2: Run test to verify it fails**

Run: `node --test tests/legal-pages.test.mjs`

Expected: FAIL car la politique de retour et le contenu structuré n’existent pas encore.

### Task 2: Structurer et rédiger les trois pages légales

**Files:**
- Modify: `site/app/pages/[slug]/page.tsx:1-64`

**Step 1: Write minimal implementation**

Définir un type de section, puis remplacer les chaînes placeholder par les sections suivantes :

```ts
{
  cgv: { title: "Conditions générales de vente", sections: [...] },
  "mentions-legales": { title: "Mentions légales", sections: [...] },
  "politique-de-retour": { title: "Politique de retour", sections: [...] },
}
```

Les trois pages doivent mettre en évidence les champs `[À COMPLÉTER]`, prévoir le droit anglais, les informations précontractuelles, le droit de rétractation de 14 jours lorsque applicable, les garanties statutaires et la procédure de retour. Rendre les titres et listes avec la hiérarchie sémantique appropriée.

**Step 2: Run test to verify it passes**

Run: `node --test tests/legal-pages.test.mjs`

Expected: PASS avec les trois pages et leurs mentions obligatoires vérifiables.

### Task 3: Ajouter la page de retour au pied de page

**Files:**
- Modify: `site/components/Footer.tsx:17-28`

**Step 1: Write minimal implementation**

Remplacer le lien « Retours & remboursements » par « Politique de retour » vers `/pages/politique-de-retour` afin d’exposer la page demandée, sans retirer les autres liens légaux.

**Step 2: Run lint and build**

Run: `npm run lint && npm run build`

Expected: exit code 0, sans erreurs ESLint ni TypeScript/Next.js.

### Task 4: Vérifier les routes et la présentation

**Files:**
- Verify: `site/app/pages/[slug]/page.tsx`
- Verify: `site/components/Footer.tsx`

**Step 1: Inspect generated content**

Run: `npm run build`

Expected: les trois slugs sont inclus dans les routes générées et la compilation se termine avec exit code 0.

**Step 2: Review requirements**

Confirmer que chaque page est en français, que les coordonnées de l’entreprise sont balisées, que le droit applicable est anglais et qu’aucune information française (RCS, TVA intracommunautaire, expédition depuis la France) n’est présentée comme un fait.
