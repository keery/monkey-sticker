import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Archivo, Geist_Mono } from "next/font/google";
import "../globals.css";
import { SITE } from "@/lib/site";
import { CartProvider } from "@/lib/cart";
import { I18nProvider } from "@/lib/i18n/context";
import { DEFAULT_LOCALE, isLocale, localePath, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { interpolate } from "@/lib/i18n/interpolate";
import { getCurrentUser } from "@/lib/auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3022";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";

// Archivo variable (graisse 100-900 + axe de chasse 62-125) : les titres
// utilisent la coupe étendue via .font-display, le texte courant la normale.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Pré-génère la coquille pour chaque langue ; les pages force-dynamic l'ignorent.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  // Chemin nu (sans préfixe de locale) transmis par le proxy → alternates
  // hreflang corrects, page par page.
  const bare = (await headers()).get("x-pathname") || "/";
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localePath(bare, l);
  languages["x-default"] = localePath(bare, DEFAULT_LOCALE);

  return {
    metadataBase: new URL(SITE_URL),
    title: interpolate(dict.meta.homeTitle, { site: SITE.name }),
    description: dict.meta.homeDescription,
    alternates: {
      canonical: localePath(bare, locale),
      languages,
    },
    openGraph: {
      siteName: SITE.name,
      locale,
      type: "website",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  // État d'auth (cookie) → passé au Header pour « Mon compte » / « Connexion ».
  const user = await getCurrentUser();

  return (
    <html
      lang={lang}
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900">
        <I18nProvider locale={lang} dict={dict}>
          <CartProvider>
            <AnnouncementBar />
            <Header user={user ? { email: user.email, name: user.name } : null} />
            <main className="flex-1">{children}</main>
            <Footer />
            <CartDrawer />
          </CartProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
