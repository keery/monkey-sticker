// Types partagés du système d'emails.

export type EmailLocale = "en" | "fr" | "es" | "de" | "nl" | "pt";

export const EMAIL_LOCALES: EmailLocale[] = ["fr", "en", "es", "de", "nl", "pt"];
/** Langue de repli : toute copie manquante retombe sur l'anglais. */
export const DEFAULT_EMAIL_LOCALE: EmailLocale = "en";

/** Un email prêt à envoyer / prévisualiser. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Choisit la copie de la locale, avec repli anglais (voir AGENTS.md). */
export function pick<T>(
  map: Partial<Record<EmailLocale, T>>,
  locale: EmailLocale,
): T {
  return (map[locale] ?? map.en) as T;
}

// --- Données métier passées aux templates -----------------------------------

export interface EmailOrderItem {
  name: string;
  qty: number;
  price: number;
  options?: Record<string, string>;
}

export interface EmailAddress {
  name?: string;
  line1?: string;
  line2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface OrderEmailData {
  orderId: string;
  items: EmailOrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  freeCount: number;
  customerName?: string;
  address?: EmailAddress;
  /** Base des liens (boutons). Ex. https://monkeysticker.fr */
  siteUrl: string;
}

export interface ShippingEmailData extends OrderEmailData {
  carrier?: string;
  trackingUrl?: string;
}

export interface RefundEmailData {
  orderId: string;
  amount: number;
  siteUrl: string;
  customerName?: string;
}

export interface PaymentFailedEmailData {
  orderId: string;
  siteUrl: string;
  customerName?: string;
}

export interface NewsletterWelcomeData {
  siteUrl: string;
}

// --- Registre / atelier de prévisualisation ---------------------------------

/** Entrée du registre : de quoi lister et prévisualiser un template. */
export interface EmailPreview {
  id: string;
  /** Nom affiché dans l'atelier (FR). */
  name: string;
  /** À quel moment il part (FR). */
  description: string;
  /** Regroupement dans l'atelier. */
  category: "Commandes" | "Marketing";
  /** Langues réellement traduites (les autres retombent sur l'anglais). */
  translated: EmailLocale[];
  /** Rend l'email avec des données d'exemple, pour une langue donnée. */
  render: (locale: EmailLocale) => RenderedEmail;
}
