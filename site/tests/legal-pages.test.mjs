import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageFile = new URL("../app/pages/[slug]/page.tsx", import.meta.url);

test("les pages légales couvrent les obligations d’une société britannique", async () => {
  const source = await readFile(pageFile, "utf8");

  for (const expectedContent of [
    "cgv:",
    '"mentions-legales"',
    '"politique-de-retour"',
    "[À COMPLÉTER : raison sociale]",
    "Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013",
    "Droit de rétractation",
    "Droit applicable et juridiction",
  ]) {
    assert.ok(source.includes(expectedContent), `Contenu manquant : ${expectedContent}`);
  }
});
