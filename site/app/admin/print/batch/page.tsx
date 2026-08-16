import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getOrders, flattenPrintUnits, type PrintUnit } from "@/lib/orders";
import { getCatalog } from "@/lib/catalog";
import type { ImageTransform } from "@/lib/products";
import { CardDesign } from "@/components/CardDesign";
import { Wordmark } from "@/components/Wordmark";
import { PrintToolbar } from "@/components/admin/PrintToolbar";
import { PrintArtwork } from "@/components/admin/PrintArtwork";
import { SITE } from "@/lib/site";
import {
  ART_MM,
  ART_POS_MM,
  BAND_MM,
  BLEED_MM,
  CARD_CORNER_MM,
  CARD_MM,
  CARD_POS_MM,
  ORANGE_MM,
  PER_SHEET,
  SHEET_MM,
  TILE_MM,
  chunkIntoSheets,
  slotPosition,
} from "@/lib/print-layout";

export const dynamic = "force-dynamic";

// Un exemplaire physique de sticker imprimé.
//  · l'artwork est en GRAND fond perdu : il remplit toute la largeur et tout le
//    bas de la tuile ; la carte est découpée (kiss-cut) en son milieu ;
//  · le kiss-cut (contour carte + fenêtre puce) est tracé par la grille
//    Silhouette, jamais imprimé ;
//  · la bande de branding (logo) + la bande orange en haut forment la matrice :
//    elles se retirent avec le support, seule la carte découpée reste.
function PrintSticker({
  unit,
  transform,
  background,
}: {
  unit: PrintUnit;
  transform?: ImageTransform;
  background?: string;
}) {
  const src = unit.customImage ?? unit.image;
  return (
    <div
      style={{
        position: "relative",
        width: `${TILE_MM.w}mm`,
        height: `${TILE_MM.h}mm`,
        overflow: "hidden",
        borderRadius: "1.5mm",
        background: "var(--color-night, #1a1712)",
      }}
    >
      {/* ARTWORK + FOND PERDU dans la zone (sous la bande orange, jusqu'au bas) */}
      {src ? (
        // Image : VRAI fond perdu par étirement des bords (canvas edge-clamp).
        // La carte est rendue nette (cover, = aperçu du site) et les bords sont
        // étirés vers l'extérieur — pas une copie de l'image posée derrière.
        <div
          style={{
            position: "absolute",
            left: `${ART_POS_MM.x}mm`,
            top: `${ART_POS_MM.y}mm`,
            width: `${ART_MM.w}mm`,
            height: `${ART_MM.h}mm`,
            overflow: "hidden",
          }}
        >
          <PrintArtwork
            src={src}
            alt={unit.name}
            art={{ w: ART_MM.w, h: ART_MM.h }}
            card={{
              x: CARD_POS_MM.x - ART_POS_MM.x,
              y: CARD_POS_MM.y - ART_POS_MM.y,
              w: CARD_MM.w,
              h: CARD_MM.h,
            }}
            cornerMm={CARD_CORNER_MM}
            transform={unit.customImage ? undefined : transform}
            background={unit.customImage ? undefined : background}
          />
        </div>
      ) : unit.theme ? (
        // Design généré (motif vectoriel) : le motif s'étend naturellement
        // jusqu'aux bords (slice) ; carte nette par-dessus (meet = aperçu site).
        <>
          <div
            style={{
              position: "absolute",
              left: `${ART_POS_MM.x}mm`,
              top: `${ART_POS_MM.y}mm`,
              width: `${ART_MM.w}mm`,
              height: `${ART_MM.h}mm`,
              overflow: "hidden",
            }}
          >
            <CardDesign theme={unit.theme} seed={unit.handle} showChip={false} preserveAspectRatio="xMidYMid slice" className="w-full h-full" />
          </div>
          <div
            style={{
              position: "absolute",
              left: `${CARD_POS_MM.x}mm`,
              top: `${CARD_POS_MM.y}mm`,
              width: `${CARD_MM.w}mm`,
              height: `${CARD_MM.h}mm`,
              overflow: "hidden",
            }}
          >
            <CardDesign theme={unit.theme} seed={unit.handle} showChip={false} className="w-full h-full" />
          </div>
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            left: `${ART_POS_MM.x}mm`,
            top: `${ART_POS_MM.y}mm`,
            width: `${ART_MM.w}mm`,
            height: `${ART_MM.h}mm`,
            background: "#eee",
          }}
        />
      )}

      {/* Pas de trait de coupe imprimé : la découpe (contour carte + fenêtre
          puce) est réalisée par la grille Silhouette `sheet_a4_silhouette.svg`
          via les repères print & cut. On n'imprime que l'artwork en fond perdu ;
          les pointillés finiraient sinon en encre sur le sticker fini. */}

      {/* Bande de branding (matrice — se retire) : logo comme sur le site */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${BAND_MM}mm`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.8mm",
          color: "var(--color-ivory, #f2eee4)",
          background: "var(--color-night, #1a1712)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SITE.logo} alt="" style={{ height: "7mm", width: "auto" }} />
        <span style={{ fontSize: "3mm", lineHeight: 1 }}>
          <Wordmark />
        </span>
      </div>

      {/* Bande orange (matrice — se retire) : sépare le branding du fond perdu */}
      <div
        style={{
          position: "absolute",
          top: `${BAND_MM}mm`,
          left: 0,
          right: 0,
          height: `${ORANGE_MM}mm`,
          background: "var(--color-flame, #e0642a)",
        }}
      />
    </div>
  );
}

export default async function PrintBatchPage(props: PageProps<"/admin/print/batch">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const idsFilter =
    typeof sp.ids === "string" ? sp.ids.split(",").map((s) => s.trim()) : null;

  const all = await getOrders();
  const orders = all.filter(
    (o) => (idsFilter ? idsFilter.includes(o.id) : o.status === "new"),
  );
  const units = flattenPrintUnits(orders);
  const sheets = chunkIntoSheets(units);

  // Cadrage de l'artwork résolu par handle : ce que l'atelier a positionné dans
  // l'admin est imprimé à l'identique (les commandes ne snapshotent que l'image).
  const { products } = await getCatalog();
  const transformByHandle = new Map(products.map((p) => [p.handle, p.imageTransform]));
  const backgroundByHandle = new Map(products.map((p) => [p.handle, p.imageBackground]));

  if (units.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg font-semibold text-ivory">Rien à imprimer 🎉</p>
        <p className="mt-2 text-sm text-ivory-dim">
          Toutes les commandes sont déjà imprimées ou expédiées.
        </p>
        <Link href="/admin/orders" className="mt-6 inline-block text-sm font-semibold text-flame hover:text-flame-deep">
          ← Retour aux commandes
        </Link>
      </div>
    );
  }

  return (
    <div className="print-area -mx-4 -my-6 min-h-screen bg-night sm:-mx-6 lg:-mx-8 xl:-mx-10 2xl:-mx-12">
      {/* styles d'impression : ne garder QUE les feuilles */}
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        /* imprimer les fonds sombres (cadre + bande de branding), sinon ignorés */
        .sheet, .sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; inset: 0; background: white !important; }
          .print-hidden { display: none !important; }
          .sheet { margin: 0 !important; box-shadow: none !important; page-break-after: always; }
        }
      `}</style>

      <PrintToolbar orderIds={orders.map((o) => o.id)} sheetCount={sheets.length} />

      <div className="print-hidden px-6 py-3 text-xs text-ivory-dim">
        {orders.length} commande{orders.length > 1 ? "s" : ""} · {units.length} sticker
        {units.length > 1 ? "s" : ""} · {sheets.length} feuille{sheets.length > 1 ? "s" : ""} A4
        (max {PER_SHEET}/feuille, coins réservés aux repères de découpe) ·{" "}
        <Link href="/admin/orders" className="text-flame underline hover:text-flame-deep">← commandes</Link>
      </div>

      {/* Les feuilles */}
      {sheets.map((sheetUnits, s) => (
        <section
          key={s}
          className="sheet bg-white shadow-lg mx-auto my-6 relative"
          style={{ width: `${SHEET_MM.w}mm`, height: `${SHEET_MM.h}mm` }}
        >
          {sheetUnits.map((u, i) => {
            const pos = slotPosition(i);
            return (
              <div
                key={i}
                style={{ position: "absolute", left: `${pos.x}mm`, top: `${pos.y}mm` }}
              >
                <PrintSticker
                  unit={u}
                  transform={u.imageTransform ?? transformByHandle.get(u.handle)}
                  background={u.imageBackground ?? backgroundByHandle.get(u.handle)}
                />
              </div>
            );
          })}
          {/* pied de feuille discret, hors zone de découpe et de repères */}
          <p
            style={{
              position: "absolute",
              bottom: "3mm",
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: "6pt",
              color: "#999",
            }}
          >
            Monkey Sticker — feuille {s + 1}/{sheets.length} — imprimer à 100 % (jamais
            « ajuster à la page ») — fond perdu ≥ {BLEED_MM} mm — découpe par la grille
            Silhouette (repères print & cut) — les bandes logo + orange se retirent
          </p>
        </section>
      ))}

      {/* Bordereau de production (dernière page) */}
      <section
        className="sheet bg-white shadow-lg mx-auto my-6 relative"
        style={{ width: `${SHEET_MM.w}mm`, height: `${SHEET_MM.h}mm`, padding: "15mm" }}
      >
        <h1 style={{ fontSize: "14pt", fontWeight: 700 }}>Bordereau de production</h1>
        <p style={{ fontSize: "8pt", color: "#666", marginTop: "2mm" }}>
          {new Date().toLocaleDateString("fr-FR")} · {orders.length} commande
          {orders.length > 1 ? "s" : ""} · {units.length} sticker{units.length > 1 ? "s" : ""}
        </p>
        <table style={{ width: "100%", marginTop: "6mm", fontSize: "8pt", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              <th style={{ padding: "1.5mm" }}>Feuille</th>
              <th style={{ padding: "1.5mm" }}>Case</th>
              <th style={{ padding: "1.5mm" }}>Commande</th>
              <th style={{ padding: "1.5mm" }}>Design</th>
              <th style={{ padding: "1.5mm" }}>Options</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "1.5mm" }}>{Math.floor(i / PER_SHEET) + 1}</td>
                <td style={{ padding: "1.5mm" }}>{(i % PER_SHEET) + 1}</td>
                <td style={{ padding: "1.5mm", fontWeight: 600 }}>{u.orderId}</td>
                <td style={{ padding: "1.5mm" }}>{u.name}</td>
                <td style={{ padding: "1.5mm", color: "#666" }}>
                  {u.options ? Object.entries(u.options).map(([k, v]) => `${k}: ${v}`).join(" · ") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ position: "absolute", bottom: "10mm", left: "15mm", right: "15mm", fontSize: "7pt", color: "#999" }}>
          Cases numérotées de gauche à droite puis de haut en bas. Ne pas oublier : berceau,
          notice, lingette et 2ᵉ sticker dans chaque colis.
        </p>
      </section>
    </div>
  );
}
