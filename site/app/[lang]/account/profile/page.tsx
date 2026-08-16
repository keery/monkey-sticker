import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { ProfileForm } from "@/components/account/ProfileForm";
import { authPanel, fieldLabel } from "@/lib/account-ui";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/profile">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: dict.account.profileTitle };
}

export default async function AccountProfilePage({
  params,
}: PageProps<"/[lang]/account/profile">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const user = await requireUser("/account/profile");

  // Adresse dérivée (lecture seule) de la dernière commande payée avec adresse.
  const orders = await getOrdersForUser(user.id, user.email);
  const withAddress = orders.find((o) => o.customer?.address?.line1);
  const addr = withAddress?.customer?.address;

  return (
    <div className="space-y-8">
      <h2 className="font-display uppercase text-xl text-ivory">
        {dict.account.profileTitle}
      </h2>

      <div className={authPanel}>
        <ProfileForm initialName={user.name ?? ""} />
        <div className="mt-6 border-t border-white/10 pt-6">
          <span className={fieldLabel}>{dict.account.profileEmailLabel}</span>
          <p className="text-sm text-ivory">{user.email}</p>
        </div>
      </div>

      {addr && (
        <div className={authPanel}>
          <span className={fieldLabel}>{dict.account.lastAddress}</span>
          <p className="text-sm text-ivory">
            {addr.line1}
            {addr.line2 ? `, ${addr.line2}` : ""}
            <br />
            {[addr.postalCode, addr.city].filter(Boolean).join(" ")}
            {addr.country ? ` · ${addr.country}` : ""}
          </p>
          <p className="mt-2 text-xs text-ivory-dim">{dict.account.addressNote}</p>
        </div>
      )}
    </div>
  );
}
