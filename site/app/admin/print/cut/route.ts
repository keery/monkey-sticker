// Fichier de découpe Silhouette d'UNE feuille A4, en SVG.
//
// Même sélection de commandes et même imposition que /admin/print/batch : le
// SVG est donc aligné pile sur l'artwork imprimé (source unique = print-layout).
// Silhouette Studio l'importe, ajoute ses repères print & cut, puis découpe.
//
// GET /admin/print/cut?ids=MS-1,MS-2&sheet=1
//   · ids   : mêmes ids que la feuille imprimée (sinon commandes « new »).
//   · sheet : numéro de feuille (1-indexé).

import { getOrders, flattenPrintUnits } from "@/lib/orders";
import { buildSheetCutSvg, chunkIntoSheets } from "@/lib/print-layout";
import { getAdminOr403 } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const guard = await getAdminOr403();
  if (guard instanceof Response) return guard;

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  const idsFilter = idsParam
    ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  const sheetParam = Number(url.searchParams.get("sheet") ?? "1");

  const all = await getOrders();
  const orders = all.filter((o) =>
    idsFilter ? idsFilter.includes(o.id) : o.status === "new",
  );
  const sheets = chunkIntoSheets(flattenPrintUnits(orders));

  if (sheets.length === 0) {
    return new Response("Aucune feuille à découper.", { status: 404 });
  }
  const n = Number.isFinite(sheetParam) ? sheetParam : 1;
  const idx = Math.min(Math.max(1, Math.trunc(n)), sheets.length) - 1;

  const svg = buildSheetCutSvg(sheets[idx]);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="decoupe-feuille-${idx + 1}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
