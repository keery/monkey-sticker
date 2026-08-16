"use client";

// Sélection de puce partagée entre le sélecteur (bloc d'achat) et les aperçus
// carte, pour un rendu live : changer le format de puce (petite / grande / sans)
// met l'aperçu à jour instantanément. Le contexte vit au niveau de la page
// produit, qui enveloppe les deux colonnes (aperçus + achat).

import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import type { ChipSize } from "@/lib/site";
import { CardVisual } from "./CardVisual";

type ChipSelection = { chip: ChipSize; setChip: (size: ChipSize) => void };

const ChipContext = createContext<ChipSelection | null>(null);

export function ChipSelectionProvider({
  children,
  initial = "small",
}: {
  children: ReactNode;
  initial?: ChipSize;
}) {
  const [chip, setChip] = useState<ChipSize>(initial);
  return <ChipContext.Provider value={{ chip, setChip }}>{children}</ChipContext.Provider>;
}

export function useChipSelection(): ChipSelection {
  const ctx = useContext(ChipContext);
  if (!ctx) throw new Error("useChipSelection doit être utilisé dans <ChipSelectionProvider>");
  return ctx;
}

// Aperçu carte branché sur la sélection : identique à <CardVisual>, mais la
// taille de puce suit le sélecteur en direct.
export function LiveCardVisual(props: Omit<ComponentProps<typeof CardVisual>, "chipSize">) {
  const { chip } = useChipSelection();
  return <CardVisual {...props} chipSize={chip} />;
}
