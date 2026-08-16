"use client";

// Bloc d'achat en peau de nuit (même vocabulaire que l'atelier /create-own) :
// bundles 2/4/8/12 avec offerts, pas d'extras payants (tout le nécessaire de
// pose est offert), ligne récap, estimation de livraison.

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { hasColorVariants, type Product } from "@/lib/products";
import { CHIP_SIZES, NOTCH_OPTION } from "@/lib/site";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { LOCALE_INTL } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";
import { interpolate, plural } from "@/lib/i18n/interpolate";
import { ChipSizePicker } from "./ChipSizePicker";
import { NotchPicker } from "./NotchPicker";
import { CardVisual } from "./CardVisual";
import { useChipSelection } from "./ChipSelection";

const BUNDLES = [
  { qty: 2, tag: null },
  { qty: 4, tag: "popular" },
  { qty: 8, tag: null },
  { qty: 12, tag: "bestValue" },
] as const;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

// Rangée de cartes-bijoux : apparition en cascade, comme des enseignes qui
// s'allument une à une (ease-out-expo, jamais de rebond).
const stripContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};
const stripItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
};

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
  const reduce = useReducedMotion();
  const { addItem } = useCart();
  const isSticker = product.kind === "sticker";
  const [bundleQty, setBundleQty] = useState<number>(isSticker ? 2 : 1);
  // Puce + encoche partagées avec les aperçus carte (colonne de gauche) : changer
  // la puce OU cocher l'encoche met le rendu à jour en direct.
  const { chip, setChip, notch, setNotch, setVariant } = useChipSelection();
  const unitPrice = product.price;

  // Couleurs (variantes) : le client choisit toujours une couleur ; la 1ʳᵉ
  // (couleur principale = image du produit) est pré-sélectionnée par défaut.
  const variants = hasColorVariants(product) ? product.variants! : null;
  const [colorIndex, setColorIndex] = useState(0);
  const selectedVariant = variants ? variants[colorIndex] : null;

  function selectColor(i: number) {
    setColorIndex(i);
    const v = variants![i];
    // met à jour les aperçus carte (image + fond) et l'anneau du stage (swatch)
    setVariant({
      image: v.image,
      background: v.imageBackground ?? product.imageBackground,
      swatch: v.swatch,
    });
  }

  const freeCount = isSticker ? Math.floor(bundleQty / 2) : 0;
  const payable = unitPrice * (bundleQty - freeCount);
  const fullPrice = unitPrice * bundleQty;

  function addToCart() {
    // Options : puce (stickers) + couleur (produits à variantes). La couleur
    // choisie détermine l'image de la ligne ; le serveur la revérifie au paiement.
    const options: Record<string, string> = {};
    if (isSticker) options.Puce = CHIP_SIZES.find((c) => c.key === chip)!.optionValue;
    if (selectedVariant) options.Couleur = selectedVariant.name;
    // Encoche : ajoutée seulement si demandée (« sans » = carte standard).
    if (isSticker && notch === "notch") options[NOTCH_OPTION.key] = NOTCH_OPTION.value;

    addItem(
      {
        handle: product.handle,
        name: product.name,
        price: unitPrice,
        kind: product.kind,
        theme: product.theme,
        image: selectedVariant ? selectedVariant.image : product.image,
        options: Object.keys(options).length ? options : undefined,
      },
      bundleQty,
    );
  }

  return (
    <div className="space-y-6">
      {/* Couleur : rangée de cartes-bijoux. Chacune s'allume à la teinte de son
          design (langage des halos du site) ; la choisie s'éclaire et pilote le
          grand aperçu « stage » de gauche, via le contexte ChipSelection. La
          sélection se lit par la lumière (halo + fin liseré + élévation), pas par
          une coche. */}
      {variants && selectedVariant && (
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-ivory">{dict.productPage.colorHeading}</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={selectedVariant.name}
                className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ivory-dim"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={reduce ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: selectedVariant.swatch ?? "#cccccc",
                    boxShadow: `0 0 8px ${selectedVariant.swatch ?? "#cccccc"}`,
                  }}
                />
                {selectedVariant.name}
              </motion.span>
            </AnimatePresence>
          </div>
          <motion.div
            className="flex flex-wrap gap-3.5"
            variants={stripContainer}
            initial={reduce ? false : "initial"}
            animate="animate"
          >
            {variants.map((v, i) => {
              const active = colorIndex === i;
              const sw = v.swatch ?? "#cccccc";
              return (
                <motion.button
                  key={v.name}
                  type="button"
                  variants={stripItem}
                  onClick={() => selectColor(i)}
                  aria-pressed={active}
                  aria-label={interpolate(dict.productPage.variantSwatchLabel, { color: v.name })}
                  title={v.name}
                  whileTap={reduce ? undefined : { scale: 0.95 }}
                  className={`group relative shrink-0 rounded-[9px] transition-opacity duration-500 ease-out-expo motion-reduce:transition-none ${focusRing} ${
                    active ? "opacity-100" : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <span
                    className={`relative block origin-bottom transition-transform duration-500 ease-out-expo motion-reduce:transition-none ${
                      active
                        ? "-translate-y-1.5 scale-[1.06]"
                        : "group-hover:-translate-y-0.5 group-hover:scale-[1.03]"
                    }`}
                  >
                    {/* halo à la couleur du design : éteint au repos, s'allume au survol, bloom quand actif */}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute -inset-3 rounded-[16px] blur-xl transition-opacity duration-500 ease-out-expo motion-reduce:transition-none ${
                        active ? "opacity-90" : "opacity-0 group-hover:opacity-40"
                      }`}
                      style={{ background: `radial-gradient(58% 58% at 50% 45%, ${sw}, transparent 70%)` }}
                    />
                    {/* la carte-vignette : bord lumineux à sa couleur quand active (pas un liseré dur) */}
                    <span
                      className="relative block w-[4.5rem] overflow-hidden rounded-[6px]"
                      style={{
                        boxShadow: active
                          ? `0 0 0 1px ${sw}, 0 0 0 4px ${sw}2e, 0 12px 26px -8px ${sw}c0`
                          : "inset 0 0 0 1px rgba(255,255,255,0.09)",
                      }}
                    >
                      <CardVisual
                        image={v.image}
                        theme={product.theme}
                        seed={`${product.handle}-${v.name}`}
                        transform={product.imageTransform}
                        background={v.imageBackground ?? product.imageBackground}
                        showChip={false}
                        className="w-full"
                      />
                      {/* léger vernis en haut, comme sur la vraie carte */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-ivory/12 to-transparent"
                      />
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      )}

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

          {/* Encoche : option supplémentaire pour les cartes à repère tactile */}
          <div>
            <p className="text-sm font-semibold text-ivory mb-2.5">{dict.productPage.notchHeading}</p>
            <NotchPicker value={notch} onChange={setNotch} tone="dark" />
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
