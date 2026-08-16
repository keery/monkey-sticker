// Génère le PDF de production (toutes les feuilles + bordereau) en rendant la
// page /admin/print/batch dans un Chromium headless. Renvoie un téléchargement.
//
//   GET /admin/print/pdf              -> toutes les commandes « à imprimer »
//   GET /admin/print/pdf?ids=MS-1,..  -> le lot exact affiché dans le batch

import { cookies } from "next/headers";
import { renderUrlToPdf } from "@/lib/pdf-render";
import { getAdminOr403, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const guard = await getAdminOr403();
  if (guard instanceof Response) return guard;

  const { origin, searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");
  const batchUrl = `${origin}/admin/print/batch${ids ? `?ids=${encodeURIComponent(ids)}` : ""}`;

  // La page batch est protégée (requireAdmin) : on transmet le cookie de session
  // de l'admin appelant au navigateur headless pour qu'il passe la garde.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const cookie = token ? { name: SESSION_COOKIE, value: token, url: origin } : undefined;

  try {
    const pdf = await renderUrlToPdf(batchUrl, { cookie });
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="monkey-sticker-feuilles-${stamp}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Échec génération PDF:", err);
    return new Response(
      "Échec de génération du PDF. Un navigateur headless est requis : " +
        "lance `npx playwright install chromium` dans site/, puis réessaie.",
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}
