import { getEnv } from "@/lib/cloudflare";
import { isStripeConfigured } from "@/lib/stripe/checkout";
import { stripeRequest } from "@/lib/stripe/api";

type CheckoutSession = {
  id: string;
  url: string | null;
  payment_status: string;
  status: string;
  metadata?: Record<string, string>;
  payment_intent?: string | { id: string };
};

export function businessSlotPriceCents(env: { BUSINESS_EXTRA_SLOT_PRICE_CENTS?: string }) {
  const parsed = Number(env.BUSINESS_EXTRA_SLOT_PRICE_CENTS ?? "500000");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500000;
}

export function businessSlotCurrency(env: { BUSINESS_EXTRA_SLOT_CURRENCY?: string }) {
  return (env.BUSINESS_EXTRA_SLOT_CURRENCY ?? "UZS").toUpperCase();
}

export async function createBusinessSlotCheckoutSession({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const env = await getEnv();
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!isStripeConfigured(secretKey)) {
    throw new Error("Stripe is not configured");
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "https://kimkim.uz";
  const amountCents = businessSlotPriceCents(env);
  const currency = businessSlotCurrency(env).toLowerCase();

  return stripeRequest<CheckoutSession>("/checkout/sessions", secretKey!, {
    mode: "payment",
    success_url: `${appUrl}/${locale}/catalog/manage?slot_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/${locale}/catalog/manage?slot_checkout=cancelled`,
    client_reference_id: userId,
    metadata: {
      purchase_type: "business_slot",
      user_id: userId,
      slots_granted: "1",
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: "KimKim business listing slot",
            description: "Add one extra business listing to your KimKim catalog account.",
          },
        },
      },
    ],
  });
}

export { retrieveCheckoutSession, checkoutSessionIsPaid, paymentIntentId } from "@/lib/stripe/checkout";
