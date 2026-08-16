// Rendu PDF haute qualité via Chromium headless (playwright-core).
// NE PAS importer côté client — lance un navigateur, accès fichiers.
//
// On pilote le même moteur que l'impression du navigateur : le PDF est donc
// fidèle au rendu écran (fonds sombres, SVG vectoriels, textes nets, images à
// leur résolution native). Idéal pour envoyer les feuilles à l'imprimeur.

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { chromium } from "playwright-core";

// Dossiers de cache où Playwright range les navigateurs, selon l'OS.
function cacheDirs(): string[] {
  const home = os.homedir();
  if (process.platform === "darwin") return [path.join(home, "Library/Caches/ms-playwright")];
  if (process.platform === "win32") return [path.join(home, "AppData/Local/ms-playwright")];
  return [path.join(home, ".cache/ms-playwright")];
}

// Binaires possibles dans un dossier de build (headless shell d'abord, sinon
// Chromium complet), couvrant macOS / Linux / Windows.
const BINARIES = [
  "chrome-headless-shell-mac-arm64/chrome-headless-shell",
  "chrome-headless-shell-mac-x64/chrome-headless-shell",
  "chrome-headless-shell-linux/chrome-headless-shell",
  "chrome-headless-shell-win64/chrome-headless-shell.exe",
  "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
  "chrome-linux/chrome",
  "chrome-win/chrome.exe",
];

// Trouve le navigateur headless installé le plus récent. Surcharge possible via
// PLAYWRIGHT_CHROMIUM_PATH. null si rien trouvé (playwright tentera son défaut).
async function findChromium(): Promise<string | null> {
  const override = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (override) return override;

  const rank = (n: string) =>
    n.startsWith("chromium_headless_shell-") ? 2 : n.startsWith("chromium-") ? 1 : 0;
  const build = (n: string) => Number(n.match(/-(\d+)$/)?.[1] ?? 0);

  for (const dir of cacheDirs()) {
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    const candidates = entries
      .filter((e) => rank(e) > 0)
      .sort((a, b) => rank(b) - rank(a) || build(b) - build(a));
    for (const c of candidates) {
      for (const rel of BINARIES) {
        const full = path.join(dir, c, rel);
        try {
          await fs.access(full);
          return full;
        } catch {
          /* essaie le suivant */
        }
      }
    }
  }
  return null;
}

/** Rend une URL en PDF A4 (Buffer), fonds compris, taille de page pilotée par
 * les règles @page de la feuille. Lève si aucun navigateur n'est disponible. */
export async function renderUrlToPdf(
  url: string,
  opts?: { cookie?: { name: string; value: string; url: string } },
): Promise<Buffer> {
  const executablePath = (await findChromium()) ?? undefined;
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const context = await browser.newContext();
    // La page /admin/print/batch est protégée (requireAdmin) : on transmet le
    // cookie de session de l'admin appelant pour que le rendu headless passe la
    // garde (sinon il serait redirigé vers /login → PDF cassé).
    if (opts?.cookie) {
      await context.addCookies([
        { ...opts.cookie, httpOnly: true, sameSite: "Lax" },
      ]);
    }
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    // s'assurer que les fontes (wordmark) sont prêtes avant le rendu
    try {
      await page.evaluate(() => (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready);
    } catch {
      /* pas bloquant */
    }
    // attendre que les canvas de fond perdu (edge-clamp) soient dessinés
    try {
      await page.waitForFunction(
        () => {
          const cs = Array.from(document.querySelectorAll("canvas[data-bleed]"));
          return cs.length === 0 || cs.every((c) => (c as HTMLCanvasElement).dataset.ready === "1");
        },
        { timeout: 15_000 },
      );
    } catch {
      /* pas bloquant : on rend quand même */
    }
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true, // respecte @page { size: A4; margin: 0 }
      format: "A4",
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
