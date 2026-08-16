import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AccountNav } from "@/components/account/AccountNav";
import { LogoutButton } from "@/components/account/LogoutButton";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: dict.account.accountTitle };
}

export default async function AccountLayout({
  children,
  params,
}: LayoutProps<"/[lang]/account">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  // Garde autoritaire (le proxy n'est qu'optimiste).
  const user = await requireUser();

  return (
    <div className="bg-night text-ivory">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display uppercase text-3xl text-ivory">
              {dict.account.accountTitle}
            </h1>
            <p className="mt-1 text-sm text-ivory-dim">
              {dict.account.connectedAs}{" "}
              <span className="text-ivory">{user.name ?? user.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user.role === "admin" && (
              // /admin est FR-only, hors i18n → lien simple (pas de LocaleLink).
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-full border border-flame/40 bg-flame/10 px-4 py-2 text-sm font-semibold text-flame transition-colors hover:bg-flame/20"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6l7-3z" />
                </svg>
                {dict.account.adminLink}
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
        <div className="mt-6">
          <AccountNav />
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
