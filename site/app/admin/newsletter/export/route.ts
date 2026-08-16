import { getSubscribers } from "@/lib/newsletter";
import { getAdminOr403 } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Échappe une cellule CSV : neutralise l'injection de formule (=, +, -, @…)
// et double les guillemets, puis entoure de guillemets.
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const guard = await getAdminOr403();
  if (guard instanceof Response) return guard;

  const subs = await getSubscribers();
  const lines = [
    ["email", "source", "inscrit_le"].join(","),
    ...subs.map((s) => [s.email, s.source, s.createdAt].map(csvCell).join(",")),
  ];
  // BOM UTF-8 pour qu'Excel affiche correctement les accents.
  const csv = "﻿" + lines.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="newsletter-flapy.csv"',
    },
  });
}
