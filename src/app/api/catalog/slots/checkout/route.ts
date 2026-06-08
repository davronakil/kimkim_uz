import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createPendingBusinessSlotPayment } from "@/lib/db/catalog-queries";
import {
  businessSlotCurrency,
  businessSlotPriceCents,
  createBusinessSlotCheckoutSession,
} from "@/lib/stripe/business-slots";
import { fulfillBusinessSlotCheckout } from "@/lib/stripe/fulfill-business-slot";
import { getEnv } from "@/lib/cloudflare";
import { isStripeConfigured } from "@/lib/stripe/checkout";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = await getEnv();
  if (!isStripeConfigured(env.STRIPE_SECRET_KEY)) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const locale = body.locale ?? user.language_code ?? "en";

  try {
    const session = await createBusinessSlotCheckoutSession({ userId: user.id, locale });
    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
    }

    await createPendingBusinessSlotPayment({
      userId: user.id,
      stripeCheckoutSessionId: session.id,
      amountCents: businessSlotPriceCents(env),
      currency: businessSlotCurrency(env),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Business slot checkout failed:", error);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const result = await fulfillBusinessSlotCheckout(sessionId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Business slot fulfillment failed:", error);
    return NextResponse.json({ error: "Could not confirm payment" }, { status: 500 });
  }
}
