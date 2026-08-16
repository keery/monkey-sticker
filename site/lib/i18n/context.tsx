"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionary";

interface I18nValue {
  locale: Locale;
  dict: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Fournit la locale courante + le dictionnaire résolu aux composants client.
 * Monté haut dans app/[lang]/layout.tsx ; les composants serveur en-dessous
 * peuvent quand même rendre des composants client qui lisent ce contexte.
 */
export function I18nProvider({
  locale,
  dict,
  children,
}: I18nValue & { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, dict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n doit être utilisé sous <I18nProvider>");
  return value;
}
