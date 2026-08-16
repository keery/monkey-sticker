// Catalogue seed — données locales, pas de backend.
// Les visuels sont générés en SVG par components/CardDesign.tsx à partir du thème.

import type { Locale } from "./i18n/config";

export type PatternType =
  | "gradient"
  | "waves"
  | "stripes"
  | "dots"
  | "rays"
  | "floral"
  | "grid"
  | "camo";

export interface Theme {
  pattern: PatternType;
  colors: [string, string, ...string[]]; // 2-4 couleurs hex
  dark?: boolean; // texte/puce clairs si fond sombre
}

/** Placement non destructif d'un artwork réel sur la carte (éditeur admin).
 * Valeurs normalisées, indépendantes de la résolution de l'image :
 * l'identité (scale 1, x/y 0, rotation 0) = cover centré (comportement d'origine).
 * Le même transform pilote l'aperçu (SVG), la vitrine et l'impression (canvas). */
export interface ImageTransform {
  /** facteur d'échelle, 1 = l'image couvre juste la carte (cover) */
  scale: number;
  /** décalage horizontal, en fraction de la largeur carte (+ = vers la droite) */
  x: number;
  /** décalage vertical, en fraction de la hauteur carte (+ = vers le bas) */
  y: number;
  /** rotation en degrés, sens horaire, autour du centre de la carte */
  rotation: number;
}

/** Traductions d'un produit. La langue de base (français, saisie par l'atelier)
 * reste dans les champs racine ; ce bloc porte les autres langues. */
export interface ProductI18n {
  name?: string;
  description?: string;
  badge?: string;
}

/** Une couleur sélectionnable d'un produit (variante e-commerce classique).
 * Chaque couleur a sa PROPRE image ; le cadrage (imageTransform) et la puce
 * sont partagés avec le produit (couleur principale = variants[0], dont l'image
 * est aussi `product.image`). Nom en français (v1, non traduit) — sert de
 * valeur d'option « Couleur » sur la commande. */
export interface ProductVariant {
  /** libellé couleur affiché au client (ex. « Rouge ») — clé de la commande */
  name: string;
  /** pastille de couleur du sélecteur (#RRGGBB) — absent = rendu neutre */
  swatch?: string;
  /** artwork propre à cette couleur (chemin sous /public, ex. /designs/slug.svg) */
  image: string;
  /** fond de carte propre à cette couleur — absent = fond du produit */
  imageBackground?: string;
}

export interface Product {
  handle: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  theme: Theme;
  /** artwork réel (chemin sous /public, ex. /designs/slug.svg) — prioritaire sur le thème */
  image?: string;
  /** cadrage de l'artwork réel sur la carte (éditeur admin) — absent = cover centré */
  imageTransform?: ImageTransform;
  /** couleur de fond de la carte derrière l'image (#RRGGBB), visible là où
   * l'image ne couvre pas (zoom arrière / rotation) — absent = couleur du thème */
  imageBackground?: string;
  /** handles de catégories ("all" est implicite pour les stickers) */
  collections: string[];
  rating: number;
  reviewCount: number;
  badge?: string;
  kind: "sticker" | "accessory" | "custom";
  description?: string;
  /** couleurs sélectionnables : si ≥ 2 entrées, le client DOIT choisir une
   * couleur à l'achat. variants[0] = couleur principale (image === product.image,
   * cadrage/fond du produit) ; les suivantes ont leur propre image. */
  variants?: ProductVariant[];
  /** traductions par locale (hors langue de base) — voir lib/i18n/catalog.ts */
  i18n?: Partial<Record<Locale, ProductI18n>>;
}

/** Un produit propose-t-il un choix de couleur obligatoire à l'achat ?
 * (≥ 2 variantes : la principale + au moins une autre couleur). */
export function hasColorVariants(product: Product): boolean {
  return (product.variants?.length ?? 0) >= 2;
}

export interface CategoryI18n {
  title?: string;
}

export interface Category {
  handle: string;
  title: string;
  /** catégories cœur utilisées par la home — non supprimables */
  core?: boolean;
  /** photo d'illustration (chemin sous /public, ex. /categories/slug.jpg) —
   * à défaut, une mosaïque des designs de la catégorie sert de repli */
  image?: string;
  /** handles des designs (max 4, ordonnés) affichés dans la mosaïque de repli ;
   * à défaut, les premiers designs de la catégorie sont pris */
  mosaic?: string[];
  /** traductions par locale (hors langue de base) */
  i18n?: Partial<Record<Locale, CategoryI18n>>;
}

/** Designs (max 4, ordonnés) composant la mosaïque d'illustration d'une
 * catégorie : la sélection manuelle si elle existe, sinon les premiers. */
export function categoryMosaic(category: Category, inCategory: Product[]): Product[] {
  const stickers = inCategory.filter((p) => p.kind === "sticker");
  if (category.mosaic?.length) {
    const byHandle = new Map(stickers.map((p) => [p.handle, p]));
    const picked = category.mosaic
      .map((h) => byHandle.get(h))
      .filter((p): p is Product => Boolean(p));
    if (picked.length) return picked.slice(0, 4);
  }
  return stickers.slice(0, 4);
}

export const SEED_CATEGORIES: Category[] = [
  {
    handle: "bestsellers",
    title: "Bestsellers",
    core: true,
    i18n: {
      en: { title: "Bestsellers" },
      es: { title: "Bestsellers" },
      de: { title: "Bestseller" },
      nl: { title: "Bestsellers" },
      pt: { title: "Bestsellers" },
    },
  },
  {
    handle: "just-dropped",
    title: "Nouveautés",
    core: true,
    i18n: {
      en: { title: "Just Dropped" },
      es: { title: "Novedades" },
      de: { title: "Neuheiten" },
      nl: { title: "Nieuw" },
      pt: { title: "Novidades" },
    },
  },
];

const BASE_PRICE = 7.99;

// Pas d'extras payants : le kit d'application (berceau, raclette, lingette)
// et le 2ᵉ sticker de secours sont offerts avec chaque commande.

function sticker(
  handle: string,
  name: string,
  theme: Theme,
  opts: Partial<Product> = {},
): Product {
  return {
    handle,
    name,
    price: BASE_PRICE,
    theme,
    collections: ["all"],
    rating: 4.6 + ((handle.length * 7) % 4) / 10,
    reviewCount: 12 + ((handle.charCodeAt(0) * 13) % 180),
    kind: "sticker",
    ...opts,
  };
}

export const PRODUCTS: Product[] = [
  sticker("angel", "Angel", { pattern: "rays", colors: ["#fdf6e3", "#f5d76e", "#ffffff"] }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Angel" }, es: { name: "Angel" }, de: { name: "Angel" }, nl: { name: "Angel" }, pt: { name: "Angel" } } }),
  sticker("plage", "Plage", { pattern: "waves", colors: ["#7ec8e3", "#f7e7c4", "#3a9bd5"] }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Beach" }, es: { name: "Playa" }, de: { name: "Strand" }, nl: { name: "Strand" }, pt: { name: "Praia" } } }),
  sticker("palmiers", "Palmiers", { pattern: "floral", colors: ["#0f6e4f", "#8fd6b4", "#f2e8cf"] }, { i18n: { en: { name: "Palm Trees" }, es: { name: "Palmeras" }, de: { name: "Palmen" }, nl: { name: "Palmbomen" }, pt: { name: "Palmeiras" } } }),
  sticker("noir-blanc", "Noir & Blanc", { pattern: "stripes", colors: ["#111111", "#f5f5f5"], dark: true }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Black & White" }, es: { name: "Blanco y Negro" }, de: { name: "Schwarz & Weiß" }, nl: { name: "Zwart & Wit" }, pt: { name: "Preto & Branco" } } }),
  sticker("motion-noir", "Motion Noir", { pattern: "waves", colors: ["#0b0b0d", "#3d3d46", "#6b6b78"], dark: true }, { i18n: { en: { name: "Motion Noir" }, es: { name: "Motion Noir" }, de: { name: "Motion Noir" }, nl: { name: "Motion Noir" }, pt: { name: "Motion Noir" } } }),
  sticker("ruban-noir", "Ruban Noir", { pattern: "stripes", colors: ["#141414", "#8a0f1e"], dark: true }, { i18n: { en: { name: "Black Ribbon" }, es: { name: "Cinta Negra" }, de: { name: "Schwarzes Band" }, nl: { name: "Zwart Lint" }, pt: { name: "Fita Preta" } } }),
  sticker("fleurs-bleues", "Fleurs Bleues", { pattern: "floral", colors: ["#2b4c9b", "#9db8e8", "#f0f4ff"] }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Blue Flowers" }, es: { name: "Flores Azules" }, de: { name: "Blaue Blumen" }, nl: { name: "Blauwe Bloemen" }, pt: { name: "Flores Azuis" } } }),
  sticker("hortensias", "Hortensias", { pattern: "floral", colors: ["#6d8fd4", "#c3d3f2", "#e8eefc"] }, { i18n: { en: { name: "Hydrangeas" }, es: { name: "Hortensias" }, de: { name: "Hortensien" }, nl: { name: "Hortensia's" }, pt: { name: "Hortênsias" } } }),
  sticker("japon-bleu", "Japon Bleu", { pattern: "waves", colors: ["#1d3461", "#5c88c5", "#f5f0e1"], dark: true }, { collections: ["all", "just-dropped"], i18n: { en: { name: "Blue Japan" }, es: { name: "Japón Azul" }, de: { name: "Blaues Japan" }, nl: { name: "Blauw Japan" }, pt: { name: "Japão Azul" } } }),
  sticker("billets", "Cash", { pattern: "grid", colors: ["#1d6b3f", "#a8d5ba", "#e9f5ee"] }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Cash" }, es: { name: "Cash" }, de: { name: "Cash" }, nl: { name: "Cash" }, pt: { name: "Cash" } } }),
  sticker("neon-rose", "Néon Rose", { pattern: "rays", colors: ["#ff2d95", "#2b0a3d", "#ff8ac2"], dark: true }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Neon Pink" }, es: { name: "Neón Rosa" }, de: { name: "Neon Pink" }, nl: { name: "Neon Roze" }, pt: { name: "Néon Rosa" } } }),
  sticker("neon-vert", "Néon Vert", { pattern: "grid", colors: ["#0c1f17", "#39ff88", "#127a4a"], dark: true }, { collections: ["all", "just-dropped"], i18n: { en: { name: "Neon Green" }, es: { name: "Neón Verde" }, de: { name: "Neon Grün" }, nl: { name: "Neon Groen" }, pt: { name: "Néon Verde" } } }),
  sticker("sunset", "Sunset", { pattern: "gradient", colors: ["#ff7e5f", "#feb47b", "#ffd97d"] }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Sunset" }, es: { name: "Sunset" }, de: { name: "Sunset" }, nl: { name: "Sunset" }, pt: { name: "Sunset" } } }),
  sticker("aurore", "Aurore", { pattern: "gradient", colors: ["#7f7fd5", "#86a8e7", "#91eae4"] }, { i18n: { en: { name: "Aurora" }, es: { name: "Aurora" }, de: { name: "Polarlicht" }, nl: { name: "Poollicht" }, pt: { name: "Aurora" } } }),
  sticker("lavande", "Lavande", { pattern: "gradient", colors: ["#b8a9e8", "#e6ddff", "#f6f2ff"] }, { i18n: { en: { name: "Lavender" }, es: { name: "Lavanda" }, de: { name: "Lavendel" }, nl: { name: "Lavendel" }, pt: { name: "Lavanda" } } }),
  sticker("marbre", "Marbre", { pattern: "waves", colors: ["#f4f4f6", "#d8d8de", "#bfbfc9"] }, { i18n: { en: { name: "Marble" }, es: { name: "Mármol" }, de: { name: "Marmor" }, nl: { name: "Marmer" }, pt: { name: "Mármore" } } }),
  sticker("or-noir", "Or Noir", { pattern: "dots", colors: ["#101010", "#d4af37"], dark: true }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Black Gold" }, es: { name: "Oro Negro" }, de: { name: "Schwarzes Gold" }, nl: { name: "Zwart Goud" }, pt: { name: "Ouro Negro" } } }),
  sticker("leopard", "Léopard", { pattern: "dots", colors: ["#d9a441", "#3d2b1f", "#f2d9a4"] }, { i18n: { en: { name: "Leopard" }, es: { name: "Leopardo" }, de: { name: "Leopard" }, nl: { name: "Luipaard" }, pt: { name: "Leopardo" } } }),
  sticker("zebre", "Zèbre", { pattern: "stripes", colors: ["#fafafa", "#141414"] }, { i18n: { en: { name: "Zebra" }, es: { name: "Cebra" }, de: { name: "Zebra" }, nl: { name: "Zebra" }, pt: { name: "Zebra" } } }),
  sticker("camo-urbain", "Camo Urbain", { pattern: "camo", colors: ["#3a3f44", "#6b7280", "#22262b"], dark: true }, { i18n: { en: { name: "Urban Camo" }, es: { name: "Camo Urbano" }, de: { name: "Urban Camo" }, nl: { name: "Urban Camo" }, pt: { name: "Camo Urbano" } } }),
  sticker("camo-foret", "Camo Forêt", { pattern: "camo", colors: ["#3f4f2e", "#77906a", "#243018"], dark: true }, { i18n: { en: { name: "Forest Camo" }, es: { name: "Camo Bosque" }, de: { name: "Wald Camo" }, nl: { name: "Bos Camo" }, pt: { name: "Camo Floresta" } } }),
  sticker("racing", "Racing", { pattern: "stripes", colors: ["#c8102e", "#ffffff", "#101820"] }, { collections: ["all", "just-dropped"], i18n: { en: { name: "Racing" }, es: { name: "Racing" }, de: { name: "Racing" }, nl: { name: "Racing" }, pt: { name: "Racing" } } }),
  sticker("nuit-etoilee", "Nuit Étoilée", { pattern: "dots", colors: ["#0b1d3a", "#ffd27d", "#274b8f"], dark: true }, { i18n: { en: { name: "Starry Night" }, es: { name: "Noche Estrellada" }, de: { name: "Sternennacht" }, nl: { name: "Sterrennacht" }, pt: { name: "Noite Estrelada" } } }),
  sticker("vague-hokusai", "La Vague", { pattern: "waves", colors: ["#173f5f", "#bee3f8", "#f6f0e4"], dark: true }, { i18n: { en: { name: "The Wave" }, es: { name: "La Ola" }, de: { name: "Die Welle" }, nl: { name: "De Golf" }, pt: { name: "A Onda" } } }),
  sticker("cerisier", "Cerisier", { pattern: "floral", colors: ["#f8c8dc", "#fdeef4", "#c95d84"] }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Cherry Blossom" }, es: { name: "Cerezo en Flor" }, de: { name: "Kirschblüte" }, nl: { name: "Kersenbloesem" }, pt: { name: "Cerejeira" } } }),
  sticker("mint", "Mint", { pattern: "gradient", colors: ["#98e2c6", "#d7f5e9", "#5bbd97"] }, { i18n: { en: { name: "Mint" }, es: { name: "Mint" }, de: { name: "Mint" }, nl: { name: "Mint" }, pt: { name: "Mint" } } }),
  sticker("terracotta", "Terracotta", { pattern: "gradient", colors: ["#c96f4a", "#e9b98a", "#f6e2c8"] }, { i18n: { en: { name: "Terracotta" }, es: { name: "Terracota" }, de: { name: "Terrakotta" }, nl: { name: "Terracotta" }, pt: { name: "Terracota" } } }),
  sticker("ciel", "Ciel", { pattern: "gradient", colors: ["#9ad0f5", "#e3f3ff", "#5aa9e6"] }, { i18n: { en: { name: "Sky" }, es: { name: "Cielo" }, de: { name: "Himmel" }, nl: { name: "Hemel" }, pt: { name: "Céu" } } }),
  sticker("flammes", "Flammes", { pattern: "rays", colors: ["#1a1a1a", "#ff5a1f", "#ffc21f"], dark: true }, { collections: ["all", "just-dropped"], i18n: { en: { name: "Flames" }, es: { name: "Llamas" }, de: { name: "Flammen" }, nl: { name: "Vlammen" }, pt: { name: "Chamas" } } }),
  sticker("glitch", "Glitch", { pattern: "grid", colors: ["#0d0221", "#ff2079", "#00f0ff"], dark: true }, { i18n: { en: { name: "Glitch" }, es: { name: "Glitch" }, de: { name: "Glitch" }, nl: { name: "Glitch" }, pt: { name: "Glitch" } } }),
  sticker("pixel", "Pixel", { pattern: "grid", colors: ["#f4f1de", "#3d405b", "#81b29a"] }, { i18n: { en: { name: "Pixel" }, es: { name: "Pixel" }, de: { name: "Pixel" }, nl: { name: "Pixel" }, pt: { name: "Pixel" } } }),
  sticker("smiley", "Smiley", { pattern: "dots", colors: ["#ffd93d", "#fff7cc", "#2b2b2b"] }, { collections: ["all", "just-dropped"], i18n: { en: { name: "Smiley" }, es: { name: "Smiley" }, de: { name: "Smiley" }, nl: { name: "Smiley" }, pt: { name: "Smiley" } } }),
  sticker("coeurs", "Cœurs", { pattern: "dots", colors: ["#ff5d8f", "#ffe0ea", "#c9184a"] }, { i18n: { en: { name: "Hearts" }, es: { name: "Corazones" }, de: { name: "Herzen" }, nl: { name: "Hartjes" }, pt: { name: "Corações" } } }),
  sticker("ocean", "Océan", { pattern: "waves", colors: ["#05445e", "#189ab4", "#d4f1f4"], dark: true }, { i18n: { en: { name: "Ocean" }, es: { name: "Océano" }, de: { name: "Ozean" }, nl: { name: "Oceaan" }, pt: { name: "Oceano" } } }),
  sticker("sable", "Sable", { pattern: "waves", colors: ["#e8d5b7", "#f6ecd9", "#c9a978"] }, { i18n: { en: { name: "Sand" }, es: { name: "Arena" }, de: { name: "Sand" }, nl: { name: "Zand" }, pt: { name: "Areia" } } }),
  sticker("orage", "Orage", { pattern: "rays", colors: ["#232526", "#414345", "#8e9eab"], dark: true }, { i18n: { en: { name: "Storm" }, es: { name: "Tormenta" }, de: { name: "Sturm" }, nl: { name: "Storm" }, pt: { name: "Tempestade" } } }),
  sticker("banane", "Banane", { pattern: "floral", colors: ["#ffe135", "#fff8d6", "#8a7a1e"] }, { collections: ["all", "just-dropped"], i18n: { en: { name: "Banana" }, es: { name: "Plátano" }, de: { name: "Banane" }, nl: { name: "Banaan" }, pt: { name: "Banana" } } }),
  sticker("cactus", "Cactus", { pattern: "floral", colors: ["#4a7c59", "#b5d6a7", "#f2e9dc"] }, { i18n: { en: { name: "Cactus" }, es: { name: "Cactus" }, de: { name: "Kaktus" }, nl: { name: "Cactus" }, pt: { name: "Cato" } } }),
  sticker("rouge-passion", "Rouge Passion", { pattern: "gradient", colors: ["#7b0d1e", "#c8102e", "#f16775"], dark: true }, { i18n: { en: { name: "Passion Red" }, es: { name: "Rojo Pasión" }, de: { name: "Leidenschaftsrot" }, nl: { name: "Passierood" }, pt: { name: "Vermelho Paixão" } } }),
  sticker("bleu-nuit", "Bleu Nuit", { pattern: "gradient", colors: ["#0f1b3d", "#27408b", "#5878c9"], dark: true }, { collections: ["all", "bestsellers"], i18n: { en: { name: "Midnight Blue" }, es: { name: "Azul Medianoche" }, de: { name: "Mitternachtsblau" }, nl: { name: "Middernachtblauw" }, pt: { name: "Azul Meia-Noite" } } }),
  {
    handle: "kit-application",
    name: "Kit d'application",
    price: 6.99,
    theme: { pattern: "gradient", colors: ["#eef1f5", "#ffffff"] },
    collections: ["all"],
    rating: 4.9,
    reviewCount: 214,
    kind: "accessory",
    description:
      "Raclette souple, lingette dégraissante et chiffon microfibre : tout pour une pose parfaite, sans bulles, du premier coup.",
    i18n: {
      en: {
        name: "Application Kit",
        description:
          "Soft squeegee, degreasing wipe and microfibre cloth: everything for a perfect, bubble-free application on the first try.",
      },
      es: {
        name: "Kit de Aplicación",
        description:
          "Espátula flexible, toallita desengrasante y paño de microfibra: todo para una aplicación perfecta, sin burbujas, a la primera.",
      },
      de: {
        name: "Anbringungs-Kit",
        description:
          "Weicher Rakel, entfettendes Tuch und Mikrofasertuch: alles für eine perfekte, blasenfreie Anbringung beim ersten Versuch.",
      },
      nl: {
        name: "Applicatiekit",
        description:
          "Zachte rakel, ontvettend doekje en microvezeldoek: alles voor een perfecte, bellenvrije plaatsing in één keer.",
      },
      pt: {
        name: "Kit de Aplicação",
        description:
          "Espátula flexível, toalhita desengordurante e pano de microfibra: tudo para uma aplicação perfeita, sem bolhas, à primeira.",
      },
    },
  },
];

export const CUSTOM_PRODUCT: Product = {
  handle: "create-own",
  name: "Crée le tien",
  price: 14.99,
  theme: { pattern: "gradient", colors: ["#d8d8de", "#f4f4f6"] },
  collections: ["all"],
  rating: 4.9,
  reviewCount: 486,
  kind: "custom",
  badge: "Personnalisé",
  i18n: {
    en: { name: "Make Your Own", badge: "Custom" },
    es: { name: "Crea el Tuyo", badge: "Personalizado" },
    de: { name: "Gestalte deinen", badge: "Individuell" },
    nl: { name: "Maak je Eigen", badge: "Op Maat" },
    pt: { name: "Cria o Teu", badge: "Personalizado" },
  },
};

export function getProduct(handle: string): Product | undefined {
  if (handle === CUSTOM_PRODUCT.handle) return CUSTOM_PRODUCT;
  return PRODUCTS.find((p) => p.handle === handle);
}

export function getCollection(handle: string): Product[] {
  if (handle === "all") return PRODUCTS;
  return PRODUCTS.filter((p) => p.collections.includes(handle));
}

export const COLLECTIONS: { handle: string; title: string }[] = [
  { handle: "all", title: "Tous les stickers" },
  { handle: "bestsellers", title: "Bestsellers" },
  { handle: "just-dropped", title: "Nouveautés" },
];

export type SortKey =
  | "featured"
  | "best-selling"
  | "az"
  | "za"
  | "price-asc"
  | "price-desc";

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const copy = [...products];
  switch (sort) {
    case "best-selling":
      return copy.sort((a, b) => b.reviewCount - a.reviewCount);
    case "az":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    case "za":
      return copy.sort((a, b) => b.name.localeCompare(a.name, "fr"));
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    default:
      return copy;
  }
}
