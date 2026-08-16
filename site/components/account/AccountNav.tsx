"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import { localePath } from "@/lib/i18n/config";
import { LocaleLink } from "@/components/LocaleLink";

export function AccountNav() {
  const pathname = usePathname();
  const { dict, locale } = useI18n();
  const TABS = [
    { href: "/account", label: dict.account.tabDashboard, exact: true },
    { href: "/account/orders", label: dict.account.tabOrders },
    { href: "/account/profile", label: dict.account.tabProfile },
  ];
  const isActive = (href: string, exact?: boolean) => {
    const target = localePath(href, locale);
    return exact ? pathname === target : pathname === target || pathname.startsWith(target + "/");
  };

  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((t) => {
        const active = isActive(t.href, t.exact);
        return (
          <LocaleLink
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "border-flame bg-flame/15 text-flame"
                : "border-white/15 text-ivory-dim hover:border-white/30 hover:text-ivory"
            }`}
          >
            {t.label}
          </LocaleLink>
        );
      })}
    </nav>
  );
}
