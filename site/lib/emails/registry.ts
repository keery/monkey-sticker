// Registre central des emails — tout template ajouté ici apparaît dans l'atelier
// /admin/emails. C'est la source unique listant les emails de l'application.

import type { EmailPreview } from "./types";
import { orderConfirmationPreview } from "./templates/order-confirmation";
import { shippingNotificationPreview } from "./templates/shipping-notification";
import { refundConfirmationPreview } from "./templates/refund-confirmation";
import { paymentFailedPreview } from "./templates/payment-failed";
import { newsletterWelcomePreview } from "./templates/newsletter-welcome";

export const EMAIL_PREVIEWS: EmailPreview[] = [
  orderConfirmationPreview,
  shippingNotificationPreview,
  refundConfirmationPreview,
  paymentFailedPreview,
  newsletterWelcomePreview,
];
