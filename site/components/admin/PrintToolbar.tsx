"use client";

import { useState } from "react";
import { markBatchPrintedAction } from "@/lib/order-actions";
import { btnPrimary, btnGhost, btnGhostSm, label } from "@/lib/admin-ui";

export function PrintToolbar({
  orderIds,
  sheetCount,
}: {
  orderIds: string[];
  sheetCount: number;
}) {
  const [marked, setMarked] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const idsQuery = `ids=${orderIds.join(",")}`;

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      const res = await fetch(`/admin/print/pdf?${idsQuery}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "monkey-sticker-feuilles.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(
        "Échec de génération du PDF.\n" +
          (e instanceof Error ? e.message : "Réessaie dans un instant."),
      );
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="print-hidden sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b border-white/10 bg-night-2/95 px-4 py-4 backdrop-blur sm:px-6">
      <div className="min-w-64 flex-1">
        <p className="font-semibold text-ivory">Feuilles de production A4</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ivory-dim">
          Imprimer à <strong className="text-ivory">100 % (taille réelle)</strong>, jamais
          « ajuster ». Workflow Silhouette : télécharge la grille de découpe (SVG, alignée sur
          l&apos;artwork, fenêtre puce à la taille choisie), importe-la dans Studio, place
          l&apos;artwork imprimé dessous, active les repères print &amp; cut, imprime{" "}
          <em>depuis Studio</em> puis découpe.
        </p>
      </div>

      {sheetCount > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className={label}>Découpe Silhouette (SVG)</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: sheetCount }, (_, i) => i + 1).map((n) => (
              <a key={n} href={`/admin/print/cut?${idsQuery}&sheet=${n}`} download className={btnGhostSm}>
                ✂ Feuille {n}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={downloadPdf}
          disabled={pdfBusy}
          className={btnPrimary}
          title="PDF haute qualité, toutes les pages, à envoyer à l'imprimeur"
        >
          {pdfBusy ? "Génération…" : "⬇ Télécharger le PDF"}
        </button>
        <button onClick={() => window.print()} className={btnGhost}>
          🖨 Imprimer
        </button>
        <button
          disabled={marked}
          onClick={async () => {
            await markBatchPrintedAction(orderIds);
            setMarked(true);
          }}
          className={btnGhost}
        >
          {marked ? "✓ Marquées imprimées" : "Marquer imprimées"}
        </button>
      </div>
    </div>
  );
}
