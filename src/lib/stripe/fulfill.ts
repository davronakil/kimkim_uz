import { nanoid } from "nanoid";
import { runInBackground } from "@/lib/cloudflare";
import {
  getEventById,
  getUserById,
  isEventMember,
  joinEvent,
  upsertEventPayment,
} from "@/lib/db/queries";
import {
  checkoutSessionIsPaid,
  paymentIntentId,
  retrieveCheckoutSession,
} from "@/lib/stripe/checkout";
import { upsertEventRsvp } from "@/lib/events/rsvp";
import { notifyMemberJoined } from "@/lib/telegram/notifications";

export async function fulfillCheckoutSession(sessionId: string, expectedUserId?: string) {
  const session = await retrieveCheckoutSession(sessionId);
  if (!checkoutSessionIsPaid(session)) {
    return { joined: false, status: session.payment_status as string };
  }

  const eventId = session.metadata?.event_id;
  const userId = session.metadata?.user_id;
  if (!eventId || !userId) {
    throw new Error("Checkout session metadata is incomplete");
  }

  if (expectedUserId && expectedUserId !== userId) {
    throw new Error("Checkout session does not belong to this user");
  }

  const event = await getEventById(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  await upsertEventPayment({
    id: nanoid(),
    eventId,
    userId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId(session),
    amountCents: event.ticket_price_cents ?? 0,
    currency: event.ticket_currency ?? "UZS",
    status: "completed",
  });

  const wasMember = await isEventMember(eventId, userId);
  await joinEvent(eventId, userId);
  await upsertEventRsvp(eventId, userId, "going");

  if (!wasMember) {
    const member = await getUserById(userId);
    if (member) {
      void runInBackground(
        notifyMemberJoined({
          eventId,
          member,
          memberUserId: userId,
        }),
      );
    }
  }

  return { joined: true, status: "complete", eventId };
}
