import {
  checkoutSessionIsPaid,
  paymentIntentId,
  retrieveCheckoutSession,
} from "@/lib/stripe/checkout";
import { fulfillBusinessSlotPayment } from "@/lib/db/catalog-queries";

export async function fulfillBusinessSlotCheckout(sessionId: string, expectedUserId?: string) {
  const session = await retrieveCheckoutSession(sessionId);
  if (!checkoutSessionIsPaid(session)) {
    return { fulfilled: false, status: session.payment_status as string };
  }

  const userId = session.metadata?.user_id;
  const slotsGranted = Number(session.metadata?.slots_granted ?? "1");

  if (!userId || session.metadata?.purchase_type !== "business_slot") {
    throw new Error("Checkout session metadata is incomplete");
  }

  if (expectedUserId && expectedUserId !== userId) {
    throw new Error("Checkout session does not belong to this user");
  }

  await fulfillBusinessSlotPayment({
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId(session),
    userId,
    slotsGranted: Number.isFinite(slotsGranted) && slotsGranted > 0 ? slotsGranted : 1,
  });

  return { fulfilled: true, status: "complete" };
}
