import { Archivo, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AdminNav } from "@/components/admin/AdminNav";
import { getOrders } from "@/lib/orders";
import { getProposals } from "@/lib/proposals";
import { requireAdmin } from "@/lib/auth";

// Depuis l'i18n, le back-office est un layout RACINE distinct (il n'y a plus de
// app/layout.tsx partagé). L'atelier reste en français, servi sur /admin (hors
// périmètre du proxy i18n). Il rend donc sa propre coque <html>/<body> + polices.

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = { title: "Atelier — Monkey Sticker" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Garde autoritaire : réservé au rôle admin (redirige sinon). Les pages,
  // server actions et route handlers ont leur propre garde (défense en profondeur).
  const admin = await requireAdmin("/admin");

  // Charges vives pour les pastilles de la navigation.
  const [orders, proposals] = await Promise.all([getOrders(), getProposals()]);
  const toPrint = orders.filter((o) => o.status === "new" && o.payment === "paid").length;
  const freshIdeas = proposals.filter((p) => p.status === "new").length;

  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-night text-ivory">
        <AdminNav
          counts={{ orders: toPrint, ideas: freshIdeas }}
          user={{ email: admin.email, name: admin.name }}
        />
        <div className="lg:pl-60">
          <main className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">{children}</main>
        </div>
      </body>
    </html>
  );
}
