// Coque HTML commune (structure « bulletproof » : tables + styles inline).
// En-tête wordmark + carte de contenu + pied de page, thème nuit showroom.

import { C, FONT, esc } from "./theme";
import { common, SITE_NAME, CONTACT_EMAIL } from "./copy";
import type { EmailLocale } from "./types";

function wordmark(): string {
  return `<span style="font-family:${FONT};font-size:17px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${C.ivory};">MONKEY <span style="color:${C.flame};">STICKER</span></span>`;
}

function footer(locale: EmailLocale): string {
  const c = common(locale);
  const year = new Date().getFullYear();
  return `
    <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${C.ivoryDim};">${esc(c.tagline)}</p>
    <p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:${C.ivoryDim};">${esc(c.contact)} <a href="mailto:${CONTACT_EMAIL}" style="color:${C.flame};text-decoration:none;">${CONTACT_EMAIL}</a></p>
    <p style="margin:0;font-size:11px;line-height:1.5;color:#6f685e;">© ${year} ${esc(SITE_NAME)}. ${esc(c.rights)}</p>`;
}

/** Enveloppe un corps HTML dans la coque email complète. */
export function shell(opts: {
  locale: EmailLocale;
  title: string;
  preheader: string;
  body: string;
}): string {
  const { locale, title, preheader, body } = opts;
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="color-scheme" content="dark"/>
<meta name="supported-color-schemes" content="dark"/>
<title>${esc(title)}</title>
<style>
  body{margin:0;padding:0;background:${C.night};-webkit-text-size-adjust:100%;}
  a{color:${C.flame};}
  img{border:0;line-height:100%;outline:none;text-decoration:none;}
  table{border-collapse:collapse;}
  @media (max-width:620px){
    .container{width:100% !important;}
    .px{padding-left:22px !important;padding-right:22px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.night};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.night};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
  <tr><td class="px" style="padding:4px 6px 22px;">${wordmark()}</td></tr>
  <tr><td class="px" style="background:${C.card};border:1px solid ${C.line};border-radius:20px;padding:36px 34px;font-family:${FONT};">${body}</td></tr>
  <tr><td class="px" style="padding:22px 6px 8px;font-family:${FONT};">${footer(locale)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
