// Barrel du système d'emails : fonctions de rendu (pour l'envoi futur) + registre
// (pour l'atelier de prévisualisation). NE PAS importer côté client.

export * from "./types";
export { renderOrderConfirmation } from "./templates/order-confirmation";
export { renderShippingNotification } from "./templates/shipping-notification";
export { renderRefundConfirmation } from "./templates/refund-confirmation";
export { renderPaymentFailed } from "./templates/payment-failed";
export { renderNewsletterWelcome } from "./templates/newsletter-welcome";
export { EMAIL_PREVIEWS } from "./registry";
