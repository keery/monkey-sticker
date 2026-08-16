import type { Metadata } from "next";
import { RegisterForm } from "@/components/account/RegisterForm";
import { authPanel } from "@/lib/account-ui";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/register">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: dict.account.registerTitle };
}

export default async function RegisterPage({
  params,
  searchParams,
}: PageProps<"/[lang]/register">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const email = typeof sp.email === "string" ? sp.email : "";

  return (
    <div className="bg-night text-ivory">
      <div className="mx-auto max-w-md px-4 py-16 sm:py-20">
        <h1 className="text-center font-display uppercase text-4xl text-ivory">
          {dict.account.registerTitle}
        </h1>
        <p className="mt-3 text-center text-sm text-ivory-dim">{dict.account.registerSubtitle}</p>
        <div className={`mt-8 ${authPanel}`}>
          <RegisterForm next={next} defaultEmail={email} />
        </div>
      </div>
    </div>
  );
}
