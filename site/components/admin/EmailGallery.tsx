"use client";

// Atelier de prévisualisation des emails : liste à gauche, rendu à droite dans
// une iframe isolée. Sélecteur de langue, bascule HTML/texte, largeur
// desktop/mobile, copie du HTML et ouverture en plein écran.

import { useMemo, useState } from "react";
import type { EmailLocale, RenderedEmail } from "@/lib/emails/types";
import { EMAIL_LOCALES } from "@/lib/emails/types";
import { panel, btnGhostSm, label as labelCls } from "@/lib/admin-ui";

export interface PreviewData {
  id: string;
  name: string;
  description: string;
  category: string;
  translated: EmailLocale[];
  variants: Record<EmailLocale, RenderedEmail>;
}

const LOCALE_LABEL: Record<EmailLocale, string> = {
  fr: "Français",
  en: "Anglais",
  es: "Espagnol",
  de: "Allemand",
  nl: "Néerlandais",
  pt: "Portugais",
};

export function EmailGallery({ templates }: { templates: PreviewData[] }) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id);
  const [locale, setLocale] = useState<EmailLocale>("fr");
  const [view, setView] = useState<"html" | "text">("html");
  const [mobile, setMobile] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0],
    [templates, selectedId],
  );

  const categories = useMemo(() => {
    const map = new Map<string, PreviewData[]>();
    for (const t of templates) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return [...map.entries()];
  }, [templates]);

  if (!current) return null;

  const email = current.variants[locale];
  const isFallback = !current.translated.includes(locale);

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(email.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible */
    }
  };

  const openFull = () => {
    const blob = new Blob([email.html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  };

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
      active
        ? "bg-flame text-night"
        : "border border-white/12 text-ivory-dim hover:border-white/25 hover:text-ivory"
    }`;

  return (
    <div className="grid gap-5 lg:grid-cols-[248px_1fr]">
      {/* Liste des templates */}
      <aside className={`${panel} h-max p-3`}>
        {categories.map(([cat, items]) => (
          <div key={cat} className="mb-4 last:mb-0">
            <p className={`px-2 pb-2 ${labelCls}`}>{cat}</p>
            <ul className="flex flex-col gap-1">
              {items.map((t) => {
                const active = t.id === current.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "bg-flame/[0.14] text-flame"
                          : "text-ivory-dim hover:bg-white/[0.05] hover:text-ivory"
                      }`}
                    >
                      <span className="block font-semibold">{t.name}</span>
                      <span className="mt-0.5 block text-xs text-ivory-dim/70">{t.description}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      {/* Aperçu */}
      <section className={`${panel} overflow-hidden`}>
        {/* Barre d'outils */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/10 px-4 py-3">
          {/* langues */}
          <div className="flex flex-wrap items-center gap-1.5">
            {EMAIL_LOCALES.map((loc) => (
              <button
                key={loc}
                onClick={() => setLocale(loc)}
                title={LOCALE_LABEL[loc]}
                className={chip(loc === locale)}
              >
                {loc.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-white/10" />
          {/* HTML / texte */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setView("html")} className={chip(view === "html")}>HTML</button>
            <button onClick={() => setView("text")} className={chip(view === "text")}>Texte</button>
          </div>
          <div className="h-5 w-px bg-white/10" />
          {/* largeur */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setMobile(false)} className={chip(!mobile)}>Desktop</button>
            <button onClick={() => setMobile(true)} className={chip(mobile)}>Mobile</button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={copyHtml} className={btnGhostSm}>{copied ? "Copié ✓" : "Copier le HTML"}</button>
            <button onClick={openFull} className={btnGhostSm}>Plein écran ↗</button>
          </div>
        </div>

        {/* Objet + repli langue */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-2.5">
          <p className="text-sm text-ivory-dim">
            <span className={labelCls}>Objet</span>{" "}
            <span className="font-semibold text-ivory">{email.subject}</span>
          </p>
          {isFallback && (
            <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              {LOCALE_LABEL[locale]} non traduit — repli anglais
            </span>
          )}
        </div>

        {/* Rendu */}
        <div className="flex justify-center bg-[#0b0805] p-5">
          {view === "html" ? (
            <iframe
              key={`${current.id}-${locale}-${mobile}`}
              title={`Aperçu ${current.name}`}
              srcDoc={email.html}
              sandbox=""
              className="h-[1200px] rounded-xl border border-white/10 bg-white shadow-2xl transition-[width] duration-200"
              style={{ width: mobile ? 390 : 680, maxWidth: "100%" }}
            />
          ) : (
            <pre className="h-[1200px] w-full max-w-[680px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-night p-5 font-mono text-xs leading-relaxed text-ivory-dim">
              {email.text}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}
