import type { Metadata } from "next";
import { LoginForm } from "@/components/account/LoginForm";
import { authPanel } from "@/lib/account-ui";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: dict.account.loginTitle };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;

  return (
    <div className="bg-night text-ivory">
      <div className="mx-auto max-w-md px-4 py-16 sm:py-20">
        <h1 className="text-center font-display uppercase text-4xl text-ivory">
          {dict.account.loginTitle}
        </h1>
        <p className="mt-3 text-center text-sm text-ivory-dim">{dict.account.loginSubtitle}</p>
        {sp.reset === "1" && (
          <p className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-center text-sm text-emerald-300">
            {dict.account.resetOk}
          </p>
        )}
        <div className={`mt-8 ${authPanel}`}>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
