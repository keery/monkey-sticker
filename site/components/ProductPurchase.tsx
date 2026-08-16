"use client";

// Bloc d'achat en peau de nuit (même vocabulaire que l'atelier /create-own) :
// bundles 2/4/8/12 avec offerts, pas d'extras payants (tout le nécessaire de
// pose est offert), ligne récap, estimation de livraison.

import { useState, useSyncExternalStore } from "react";
import type { Product } from "@/lib/products";
import { CHIP_SIZES } from "@/lib/site";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { LOCALE_INTL } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";
import { interpolate, plural } from "@/lib/i18n/interpolate";
import { ChipSizePicker } from "./ChipSizePicker";
import { useChipSelection } from "./ChipSelection";

const BUNDLES = [
  { qty: 2, tag: null },
  { qty: 4, tag: "popular" },
  { qty: 8, tag: null },
  { qty: 12, tag: "bestValue" },
] as const;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

// Rendu client uniquement (dates relatives) : null côté serveur pour éviter
// tout écart d'hydratation.
const subscribeNoop = () => () => {};

function DeliveryEstimate() {
  const { dict, locale } = useI18n();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!mounted) return null;
  const fmt = (d: Date) =>
    d.toLocaleDateString(LOCALE_INTL[locale], { day: "numeric", month: "long" });
  const from = new Date();
  from.setDate(from.getDate() + 6);
  const to = new Date();
  to.setDate(to.getDate() + 9);
  const range = `${fmt(from)} – ${fmt(to)}`;
  return (
    <p className="text-xs text-ivory-dim">
      📦 {dict.productPage.deliveryEstimate} <span className="font-semibold text-ivory">{range}</span>
    </p>
  );
}

export function ProductPurchase({ product }: { product: Product }) {
  const { dict, locale } = useI18n();
  const { addItem } = useCart();
  const isSticker = product.kind === "sticker";
  const [bundleQty, setBundleQty] = useState<number>(isSticker ? 2 : 1);
  // Partagé avec les aperçus carte (colonne de gauche) → mise à jour live.
  const { chip, setChip } = useChipSelection();
  const unitPrice = product.price;

  const freeCount = isSticker ? Math.floor(bundleQty / 2) : 0;
  const payable = unitPrice * (bundleQty - freeCount);
  const fullPrice = unitPrice * bundleQty;

  function addToCart() {
    addItem(
      {
        handle: product.handle,
        name: product.name,
        price: unitPrice,
        kind: product.kind,
        theme: product.theme,
        image: product.image,
        options: isSticker
          ? { Puce: CHIP_SIZES.find((c) => c.key === chip)!.optionValue }
          : undefined,
      },
      bundleQty,
    );
  }

  return (
    <div className="space-y-6">
      {isSticker && (
        <>
          {/* Bundles */}
          <div>
            <p className="text-sm font-semibold text-ivory mb-2.5">
              {dict.productPage.bundleHeading}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {BUNDLES.map((b) => {
                const free = Math.floor(b.qty / 2);
                const active = bundleQty === b.qty;
                return (
                  <button
                    key={b.qty}
                    onClick={() => setBundleQty(b.qty)}
                    aria-pressed={active}
                    className={`relative rounded-2xl border p-3.5 text-left transition-colors ${focusRing} ${
                      active
                        ? "border-flame bg-flame/10"
                        : "border-white/15 hover:border-white/40"
                    }`}
                  >
                    {b.tag && (
                      <span className="absolute -top-2.5 right-2 bg-ivory text-night text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5">
                        {dict.productPage.bundleTags[b.tag]}
                      </span>
                    )}
                    <span className="block text-sm font-bold uppercase text-ivory">{plural(locale, b.qty, dict.productPage.bundleLabel, { count: b.qty })}</span>
                    <span className="block text-xs font-semibold text-flame">
                      {plural(locale, free, dict.productPage.bundleFree, { count: free })}
                    </span>
                    <span className="block mt-1.5 text-sm font-semibold tabular-nums text-ivory">
                      {formatPrice(unitPrice * (b.qty - free), locale)}{" "}
                      <span className="text-ivory-dim line-through font-normal text-xs">
                        {formatPrice(unitPrice * b.qty, locale)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Taille de puce : la fenêtre découpée s'adapte à la carte */}
          <div>
            <p className="text-sm font-semibold text-ivory mb-2.5">{dict.productPage.chipHeading}</p>
            <ChipSizePicker value={chip} onChange={setChip} tone="dark" />
          </div>

          {/* Pas d'extras payants : on met en avant ce qui est offert */}
          <div className="rounded-2xl border border-white/15 p-4">
            <p className="text-sm font-semibold text-ivory">{dict.productPage.includedTitle}</p>
            <ul className="mt-2.5 space-y-1.5 text-sm text-ivory-dim">
              {dict.productPage.includedItems.map((item) => (
                <li key={item} className="flex items-baseline gap-2.5">
                  <span aria-hidden className="text-flame font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ligne récap */}
          <div className="rounded-2xl bg-white/5 px-4 py-3.5 flex items-center justify-between text-sm">
            <span className="font-bold uppercase tracking-wide text-ivory">
              {interpolate(dict.productPage.recap, {
                count: bundleQty,
                free: plural(locale, freeCount, dict.productPage.recapFree, { count: freeCount }),
              })}
            </span>
            <span className="tabular-nums">
              <span className="font-bold text-ivory">{formatPrice(payable, locale)}</span>{" "}
              <span className="text-ivory-dim line-through text-xs">{formatPrice(fullPrice, locale)}</span>
            </span>
          </div>
        </>
      )}

      {!isSticker && (
        <div>
          <p className="text-sm font-semibold text-ivory mb-2.5">{dict.productPage.quantity}</p>
          <div className="inline-flex items-center rounded-full border border-white/20 text-ivory">
            <button onClick={() => setBundleQty(Math.max(1, bundleQty - 1))} className="px-4 py-2" aria-label={dict.common.decrease}>−</button>
            <span className="px-2 tabular-nums font-medium">{bundleQty}</span>
            <button onClick={() => setBundleQty(bundleQty + 1)} className="px-4 py-2" aria-label={dict.common.increase}>+</button>
          </div>
        </div>
      )}

      <button
        onClick={addToCart}
        className={`w-full rounded-full bg-flame text-night h-14 px-6 text-sm font-bold uppercase tracking-wide hover:bg-flame-deep transition-colors ${focusRing}`}
      >
        {interpolate(dict.productPage.addToCart, {
          price: formatPrice(isSticker ? payable : product.price * bundleQty, locale),
        })}
      </button>

      <DeliveryEstimate />

      <ul className="space-y-2.5 text-sm">
        {[
          <>
            {dict.productPage.featureCradle}{" "}
            <a href="/pose" className="underline underline-offset-2 text-ivory-dim hover:text-ivory">
              {dict.productPage.featureCradleLink}
            </a>
          </>,
          <>{dict.productPage.featureFormat}</>,
          <>{dict.productPage.featureContactless}</>,
          <>{dict.productPage.featureAllowed}</>,
          <>{dict.productPage.featureResidue}</>,
          <>{dict.productPage.featureShipping}</>,
        ].map((item, i) => (
          <li key={i} className="flex items-baseline gap-3 text-ivory-dim">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-flame" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
