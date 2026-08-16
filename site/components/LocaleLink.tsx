"use client";

// Lien interne conscient de la locale : préfixe automatiquement le href avec la
// langue courante ("/fr/…" ; rien pour l'anglais par défaut). Utilisable aussi
// bien dans les composants client que serveur (c'est un composant client, il lit
// la locale via le contexte i18n monté dans le layout).

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { localePath } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

type LinkProps = ComponentPropsWithoutRef<typeof Link>;

export function LocaleLink({ href, ...props }: Omit<LinkProps, "href"> & { href: string }) {
  const { locale } = useI18n();
  return <Link href={localePath(href, locale)} {...props} />;
}
