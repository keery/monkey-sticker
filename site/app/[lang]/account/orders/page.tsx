import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { OrderCard } from "@/components/account/OrderCard";
import { LocaleLink } from "@/components/LocaleLink";
import { btnGhost } from "@/lib/account-ui";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account/orders">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return { title: dict.account.ordersTitle };
}

export default async function AccountOrdersPage({
  params,
}: PageProps<"/[lang]/account/orders">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const user = await requireUser("/account/orders");
  const orders = await getOrdersForUser(user.id, user.email);

  return (
    <div className="space-y-6">
      <h2 className="font-display uppercase text-xl text-ivory">
        {dict.account.ordersTitle}
      </h2>

      {orders.length > 0 ? (
        <div className="grid gap-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-sm text-ivory-dim">{dict.account.ordersEmpty}</p>
          <LocaleLink href="/collections/all" className={`mt-4 ${btnGhost}`}>
            {dict.account.discoverStickers}
          </LocaleLink>
        </div>
      )}
    </div>
  );
}
