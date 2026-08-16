// Briques réutilisables des emails (renvoient des chaînes HTML inline).

import { localePath } from "@/lib/i18n/config";
import { C, FONT, esc, money } from "./theme";
import { common } from "./copy";
import type { EmailLocale, EmailAddress, EmailOrderItem, OrderEmailData } from "./types";

/** Lien absolu vers une page du storefront, préfixé de la bonne langue. */
export function pageUrl(siteUrl: string, locale: EmailLocale, path: string): string {
  return `${siteUrl}${localePath(path, locale)}`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 14px;font-family:${FONT};font-size:26px;line-height:1.2;font-weight:800;color:${C.ivory};">${esc(text)}</h1>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.ivoryDim};">${html}</p>`;
}

export function pill(label: string): string {
  return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${C.flameTint};color:${C.flame};font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${esc(label)}</span>`;
}

export function divider(): string {
  return `<div style="height:1px;line-height:1px;font-size:0;background:${C.line};margin:22px 0;">&nbsp;</div>`;
}

/** Bouton « bulletproof » (table + lien stylé). variant ghost = contour. */
export function button(
  href: string,
  label: string,
  variant: "primary" | "ghost" = "primary",
): string {
  const primary = variant === "primary";
  const bg = primary ? C.flame : "transparent";
  const color = primary ? C.flameInk : C.ivory;
  const border = primary ? C.flame : C.line;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block;margin:2px 8px 8px 0;"><tr><td style="border-radius:999px;background:${bg};border:1px solid ${border};"><a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:14px;font-weight:700;line-height:1;color:${color};text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`;
}

/** Encadré discret pour mettre en avant un numéro de commande / une info. */
export function statBox(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td style="background:${C.night};border:1px solid ${C.line};border-radius:14px;padding:16px 20px;">
    <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.ivoryDim};">${esc(label)}</p>
    <p style="margin:0;font-family:${FONT};font-size:20px;font-weight:800;color:${C.ivory};">${esc(value)}</p>
  </td></tr></table>`;
}

function itemLine(it: EmailOrderItem, locale: EmailLocale): string {
  const opts = it.options
    ? Object.entries(it.options)
        .map(([k, v]) => `${esc(k)} : ${esc(v)}`)
        .join(" · ")
    : "";
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;color:${C.ivory};vertical-align:top;">
      <span style="color:${C.ivoryDim};">${it.qty}×</span> ${esc(it.name)}
      ${opts ? `<br/><span style="font-size:12px;color:${C.ivoryDim};">${opts}</span>` : ""}
    </td>
    <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;color:${C.ivory};text-align:right;white-space:nowrap;vertical-align:top;">${esc(money(it.price * it.qty, locale))}</td>
  </tr>`;
}

/** Tableau des articles. */
export function itemsTable(items: EmailOrderItem[], locale: EmailLocale): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items
    .map((it) => itemLine(it, locale))
    .join("")}</table>`;
}

function totalRow(label: string, value: string, opts?: { accent?: boolean; strong?: boolean }): string {
  const color = opts?.accent ? C.flame : opts?.strong ? C.ivory : C.ivoryDim;
  const size = opts?.strong ? "18px" : "14px";
  const weight = opts?.strong ? "800" : "500";
  return `<tr>
    <td style="padding:5px 0;font-family:${FONT};font-size:${size};font-weight:${weight};color:${color};">${esc(label)}</td>
    <td style="padding:5px 0;font-family:${FONT};font-size:${size};font-weight:${weight};color:${color};text-align:right;white-space:nowrap;">${esc(value)}</td>
  </tr>`;
}

/** Bloc des totaux (sous-total, remise BOGO, livraison, total). */
export function totalsTable(o: OrderEmailData, locale: EmailLocale): string {
  const c = common(locale);
  const rows: string[] = [totalRow(c.totals.subtotal, money(o.subtotal, locale))];
  if (o.discount > 0) {
    const label = o.freeCount > 0 ? `${c.totals.discount} (${o.freeCount})` : c.totals.discount;
    rows.push(totalRow(label, `−${money(o.discount, locale)}`, { accent: true }));
  }
  rows.push(totalRow(c.totals.shipping, o.shipping > 0 ? money(o.shipping, locale) : c.totals.free));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
    ${rows.join("")}
    <tr><td colspan="2" style="padding:6px 0 0;"><div style="height:1px;font-size:0;line-height:1px;background:${C.line};">&nbsp;</div></td></tr>
    ${totalRow(c.totals.total, money(o.total, locale), { strong: true })}
  </table>`;
}

/** Bloc adresse de livraison. */
export function addressBlock(title: string, a: EmailAddress): string {
  const cityLine = [a.postalCode, a.city].filter(Boolean).join(" ");
  const lines = [a.name, a.line1, a.line2, cityLine, a.country].filter(Boolean);
  return `<p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.ivoryDim};">${esc(title)}</p>
    <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ivory};">${lines.map((l) => esc(l)).join("<br/>")}</p>`;
}
