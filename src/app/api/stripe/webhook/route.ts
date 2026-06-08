import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { fulfillCheckoutSession } from "@/lib/stripe/fulfill";
import { verifyStripeWebhookSignature } from "@/lib/stripe/webhook";

type StripeWebhookEvent = {
  type: string;
  data: {
    object: {
      id: string;
    };
  };
};

export async function POST(request: NextRequest) {
  const env = await getEnv();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeWebhookSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeWebhookEvent;

  if (event.type === "checkout.session.completed") {
    try {
      await fulfillCheckoutSession(event.data.object.id);
    } catch (error) {
      console.error("Webhook fulfillment failed:", error);
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
