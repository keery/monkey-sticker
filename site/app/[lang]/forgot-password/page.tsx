import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";
import { authPanel } from "@/lib/account-ui";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/forgot-password">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: dict.account.forgotTitle };
}

export default async function ForgotPasswordPage({ params }: PageProps<"/[lang]/forgot-password">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  return (
    <div className="bg-night text-ivory">
      <div className="mx-auto max-w-md px-4 py-16 sm:py-20">
        <h1 className="text-center font-display uppercase text-4xl text-ivory">
          {dict.account.forgotTitle}
        </h1>
        <p className="mt-3 text-center text-sm text-ivory-dim">{dict.account.forgotSubtitle}</p>
        <div className={`mt-8 ${authPanel}`}>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
