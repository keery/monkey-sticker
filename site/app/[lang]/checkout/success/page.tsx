import { confirmCheckoutSession } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { ClearCartOnSuccess } from "@/components/ClearCartOnSuccess";
import { getCurrentUser } from "@/lib/auth";
import { LocaleLink } from "@/components/LocaleLink";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { interpolate } from "@/lib/i18n/interpolate";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: PageProps<"/[lang]/checkout/success">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);

  const { session_id } = await searchParams;
  const sessionId = typeof session_id === "string" ? session_id : undefined;
  // On revérifie la session auprès de Stripe et on confirme la commande ici même
  // (filet si le webhook n'est pas branché en local). Le webhook, quand il tourne,
  // fait la même bascule de façon idempotente.
  const order = sessionId ? await confirmCheckoutSession(sessionId) : undefined;
  const confirmed = order?.payment === "paid";

  // Nudge « crée ton compte » : uniquement pour un visiteur non connecté.
  const user = await getCurrentUser();
  const nudgeEmail = order?.customer?.email;

  return (
    <div className="bg-night text-ivory">
      <ClearCartOnSuccess orderId={order?.id} />
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-flame/15 text-flame">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="mt-6 font-display uppercase text-4xl sm:text-5xl text-ivory">
          {dict.checkoutPage.title}
        </h1>

        {order ? (
          <>
            <p className="mt-4 text-ivory-dim">
              {dict.checkoutPage.orderIntro}{" "}
              <span className="font-semibold text-ivory">{order.id}</span>{" "}
              {confirmed
                ? dict.checkoutPage.statusConfirmed
                : dict.checkoutPage.statusReceived}
              {". "}
              {dict.checkoutPage.emailNote}
            </p>
            <div className="mt-8 inline-flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left">
              <span className="text-xs uppercase tracking-[0.2em] text-ivory-dim">{dict.checkoutPage.totalPaidLabel}</span>
              <span className="font-display text-2xl text-ivory tabular-nums">
                {formatPrice(order.totals.total, locale)}
              </span>
              <span className="text-xs text-ivory-dim">
                {interpolate(
                  order.totals.itemCount > 1
                    ? dict.checkoutPage.itemCountPlural
                    : dict.checkoutPage.itemCountOne,
                  { count: order.totals.itemCount },
                )}
                {order.totals.freeCount > 0
                  ? ` · ${interpolate(
                      order.totals.freeCount > 1
                        ? dict.checkoutPage.freeCountPlural
                        : dict.checkoutPage.freeCountOne,
                      { count: order.totals.freeCount },
                    )}`
                  : ""}
              </span>
            </div>
            {!confirmed && (
              <p className="mt-4 text-xs text-ivory-dim/70">
                {dict.checkoutPage.paymentPending}
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-ivory-dim">
            {dict.checkoutPage.noOrder}
          </p>
        )}

        {user ? (
          <div className="mt-8">
            <LocaleLink href="/account/orders" className="text-sm text-flame hover:text-flame-deep">
              {dict.account.seeMyOrders}
            </LocaleLink>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-left">
            <p className="text-sm text-ivory">
              {nudgeEmail
                ? interpolate(dict.account.nudgeCreateWithEmail, { email: nudgeEmail })
                : dict.account.nudgeCreate}
            </p>
            <LocaleLink
              href={
                nudgeEmail
                  ? `/register?email=${encodeURIComponent(nudgeEmail)}&next=/account/orders`
                  : "/register?next=/account/orders"
              }
              className="mt-3 inline-flex rounded-full bg-flame text-night px-5 py-2.5 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors"
            >
              {dict.account.nudgeCta}
            </LocaleLink>
          </div>
        )}

        <p className="mt-8 text-sm text-ivory-dim">
          {dict.checkoutPage.shippingNote}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <LocaleLink
            href="/collections/all"
            className="rounded-full bg-flame text-night px-7 py-3.5 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors"
          >
            {dict.checkoutPage.ctaContinue}
          </LocaleLink>
          <LocaleLink
            href="/pose"
            className="rounded-full border border-white/25 text-ivory px-7 py-3.5 text-sm font-bold uppercase tracking-wide hover:border-ivory hover:bg-white/5 transition-colors"
          >
            {dict.checkoutPage.ctaPose}
          </LocaleLink>
        </div>
      </div>
    </div>
  );
}
