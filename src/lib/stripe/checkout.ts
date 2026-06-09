import { getEnv } from "@/lib/cloudflare";
import { stripeRequest } from "@/lib/stripe/api";
import type { Event } from "@/types";

type CheckoutSession = {
  id: string;
  url: string | null;
  payment_status: string;
  status: string;
  metadata?: Record<string, string>;
  payment_intent?: string | { id: string };
};

export function isStripeConfigured(secretKey?: string): boolean {
  return Boolean(secretKey?.startsWith("sk_"));
}

export function eventPaymentsEnabled(event: Event, secretKey?: string): boolean {
  return (
    event.payment_mode === "paid" &&
    isStripeConfigured(secretKey) &&
    typeof event.ticket_price_cents === "number" &&
    event.ticket_price_cents > 0
  );
}

export async function createEventCheckoutSession({
  event,
  userId,
  inviteCode,
  locale,
  referrerUserId,
}: {
  event: Event;
  userId: string;
  inviteCode: string;
  locale: string;
  referrerUserId?: string | null;
}) {
  const env = await getEnv();
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!isStripeConfigured(secretKey)) {
    throw new Error("Stripe is not configured");
  }

  if (!event.ticket_price_cents || event.ticket_price_cents <= 0) {
    throw new Error("Event ticket price is not set");
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "https://kimkim.uz";
  const currency = (event.ticket_currency ?? "UZS").toLowerCase();
  const referralQuery = referrerUserId
    ? `&${new URLSearchParams({ ref: referrerUserId }).toString()}`
    : "";

  return stripeRequest<CheckoutSession>("/checkout/sessions", secretKey!, {
    mode: "payment",
    success_url: `${appUrl}/${locale}/join/${inviteCode}?session_id={CHECKOUT_SESSION_ID}${referralQuery}`,
    cancel_url: `${appUrl}/${locale}/join/${inviteCode}?checkout=cancelled${referralQuery}`,
    client_reference_id: `${event.id}:${userId}`,
    metadata: {
      event_id: event.id,
      user_id: userId,
      invite_code: inviteCode,
      ...(referrerUserId ? { referrer_user_id: referrerUserId } : {}),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: event.ticket_price_cents,
          product_data: {
            name: event.title,
            description: event.description?.slice(0, 200) ?? undefined,
          },
        },
      },
    ],
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  const env = await getEnv();
  const secretKey = env.STRIPE_SECRET_KEY;
  if (!isStripeConfigured(secretKey)) {
    throw new Error("Stripe is not configured");
  }

  return stripeRequest<CheckoutSession>(
    `/checkout/sessions/${sessionId}`,
    secretKey!,
    undefined,
    "GET",
  );
}

export function checkoutSessionIsPaid(session: CheckoutSession) {
  return session.payment_status === "paid" || session.status === "complete";
}

export function paymentIntentId(session: CheckoutSession): string | null {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent.id;
}
