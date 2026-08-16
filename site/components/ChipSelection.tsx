"use client";

// Sélection partagée de la fiche produit (puce + couleur) entre le bloc d'achat
// et les aperçus carte, pour un rendu live : changer le format de puce OU la
// couleur met les aperçus à jour instantanément. Le contexte vit au niveau de la
// page produit, qui enveloppe les deux colonnes (aperçus + achat).

import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import type { ChipSize, NotchChoice } from "@/lib/site";
import { CardVisual } from "./CardVisual";

/** Couleur sélectionnée (produit à variantes) : image + fond à afficher, et
 * `swatch` (couleur de la pastille) qui pilote l'anneau animé du stage. */
export type VariantSelection = { image?: string; background?: string; swatch?: string } | null;

type ProductSelection = {
  chip: ChipSize;
  setChip: (size: ChipSize) => void;
  notch: NotchChoice;
  setNotch: (choice: NotchChoice) => void;
  variant: VariantSelection;
  setVariant: (variant: VariantSelection) => void;
};

const ChipContext = createContext<ProductSelection | null>(null);

export function ChipSelectionProvider({
  children,
  initial = "small",
  initialNotch = "none",
  initialVariant = null,
}: {
  children: ReactNode;
  initial?: ChipSize;
  initialNotch?: NotchChoice;
  initialVariant?: VariantSelection;
}) {
  const [chip, setChip] = useState<ChipSize>(initial);
  const [notch, setNotch] = useState<NotchChoice>(initialNotch);
  const [variant, setVariant] = useState<VariantSelection>(initialVariant);
  return (
    <ChipContext.Provider value={{ chip, setChip, notch, setNotch, variant, setVariant }}>
      {children}
    </ChipContext.Provider>
  );
}

export function useChipSelection(): ProductSelection {
  const ctx = useContext(ChipContext);
  if (!ctx) throw new Error("useChipSelection doit être utilisé dans <ChipSelectionProvider>");
  return ctx;
}

// Aperçu carte branché sur la sélection : identique à <CardVisual>, mais la
// taille de puce ET la couleur (image/fond) suivent le sélecteur en direct.
export function LiveCardVisual(props: Omit<ComponentProps<typeof CardVisual>, "chipSize" | "notch">) {
  const { chip, notch, variant } = useChipSelection();
  const image = variant?.image ?? props.image;
  const background = variant?.background ?? props.background;
  return (
    <CardVisual {...props} image={image} background={background} chipSize={chip} notch={notch === "notch"} />
  );
}
