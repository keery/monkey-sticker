import type { Metadata } from "next";
import { getResetUserId } from "@/lib/users";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";
import { authPanel, authLink } from "@/lib/account-ui";
import { LocaleLink } from "@/components/LocaleLink";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/reset-password/[token]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: dict.account.resetTitle };
}

export default async function ResetPasswordPage({
  params,
}: PageProps<"/[lang]/reset-password/[token]">) {
  const { lang, token } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const valid = (await getResetUserId(token)) != null;

  return (
    <div className="bg-night text-ivory">
      <div className="mx-auto max-w-md px-4 py-16 sm:py-20">
        <h1 className="text-center font-display uppercase text-4xl text-ivory">
          {dict.account.resetTitle}
        </h1>
        <div className={`mt-8 ${authPanel}`}>
          {valid ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="text-left">
              <p className="text-sm text-ivory-dim">{dict.account.resetInvalid}</p>
              <p className="mt-6 text-sm">
                <LocaleLink href="/forgot-password" className={authLink}>
                  {dict.account.requestNewLink}
                </LocaleLink>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
