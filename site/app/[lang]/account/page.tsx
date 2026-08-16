import { requireUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { OrderCard } from "@/components/account/OrderCard";
import { LocaleLink } from "@/components/LocaleLink";
import { btnGhost } from "@/lib/account-ui";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { interpolate, plural } from "@/lib/i18n/interpolate";

export const dynamic = "force-dynamic";

export default async function AccountHome({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const user = await requireUser();
  const orders = await getOrdersForUser(user.id, user.email);
  const recent = orders.slice(0, 3);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display uppercase text-xl text-ivory">
          {user.name
            ? interpolate(dict.account.greeting, { name: user.name })
            : dict.account.greetingFallback}
        </h2>
        <p className="mt-1 text-sm text-ivory-dim">
          {orders.length > 0
            ? plural(locale, orders.length, dict.account.ordersCount, {
                count: orders.length,
              })
            : dict.account.noOrdersYet}
        </p>
      </section>

      {recent.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ivory-dim">
              {dict.account.recentOrders}
            </h3>
            {orders.length > recent.length && (
              <LocaleLink
                href="/account/orders"
                className="text-sm text-flame hover:text-flame-deep"
              >
                {dict.account.seeAll}
              </LocaleLink>
            )}
          </div>
          <div className="grid gap-3">
            {recent.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-sm text-ivory-dim">{dict.account.noOrders}</p>
          <LocaleLink href="/collections/all" className={`mt-4 ${btnGhost}`}>
            {dict.account.discoverStickers}
          </LocaleLink>
        </section>
      )}
    </div>
  );
}
