"use client";

import { useState } from "react";
import Image from "next/image";
import { SITE } from "@/lib/site";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n/context";
import { LocaleLink } from "./LocaleLink";
import { Wordmark } from "./Wordmark";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({
  user,
}: {
  user?: { email: string; name: string | null } | null;
}) {
  const { totals, openCart } = useCart();
  const { dict } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = [
    { href: "/collections/all", label: dict.nav.allStickers },
    { href: "/collections/bestsellers", label: dict.nav.bestsellers },
    { href: "/collections/just-dropped", label: dict.nav.justDropped },
    { href: "/create-own", label: dict.nav.createOwn },
    { href: "/pages/faq", label: dict.nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur border-b bg-night/85 border-white/10 text-ivory">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        <button
          className="lg:hidden p-2 -ml-2 active:scale-90 transition-transform duration-100 ease-out"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={dict.common.menu}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <LocaleLink href="/" className="flex items-center gap-2.5">
          <Image
            src={SITE.logo}
            alt={SITE.name}
            width={38}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <Wordmark className="text-base" />
        </LocaleLink>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          {nav.map((item) => (
            <LocaleLink key={item.href} href={item.href} className="hover:opacity-60 transition-opacity">
              {item.label}
            </LocaleLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcher className="hidden sm:block" />
          <LocaleLink href="/pages/track-order" className="hidden sm:block p-2 hover:opacity-60" aria-label={dict.nav.trackOrder} title={dict.nav.trackOrder}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4m0-10v10m9-14v10l-9 4" />
            </svg>
          </LocaleLink>
          <LocaleLink
            href={user ? "/account" : "/login"}
            className="hidden sm:block p-2 hover:opacity-60"
            aria-label={user ? dict.account.accountTitle : dict.account.loginTitle}
            title={user ? dict.account.accountTitle : dict.account.loginTitle}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </LocaleLink>
          <button onClick={openCart} className="relative p-2 hover:opacity-60 active:scale-90 transition-transform duration-100 ease-out" aria-label={dict.header.cart}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2" />
            </svg>
            {totals.itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold rounded-full h-4.5 min-w-4.5 px-1 flex items-center justify-center bg-flame text-night">
                {totals.itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="lg:hidden border-t px-4 py-3 flex flex-col gap-3 text-sm font-medium border-white/10 bg-night">
          {nav.map((item) => (
            <LocaleLink key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="py-1">
              {item.label}
            </LocaleLink>
          ))}
          <LocaleLink href="/pages/track-order" onClick={() => setMenuOpen(false)} className="py-1">
            {dict.nav.trackOrder}
          </LocaleLink>
          <LocaleLink
            href={user ? "/account" : "/login"}
            onClick={() => setMenuOpen(false)}
            className="py-1"
          >
            {user ? dict.account.accountTitle : dict.account.loginTitle}
          </LocaleLink>
          <div className="pt-2 border-t border-white/10">
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  );
}
