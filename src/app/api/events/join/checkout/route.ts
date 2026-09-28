import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getCurrentUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/cloudflare";
import {
  createPendingEventPayment,
  getEventByInviteCode,
  isEventMember,
  listEventMembers,
} from "@/lib/db/queries";
import { exceedsGuestCap } from "@/lib/events/headcount";
import { createEventCheckoutSession, eventPaymentsEnabled } from "@/lib/stripe/checkout";

const checkoutSchema = z.object({
  code: z.string().min(4).max(32),
  referrer_user_id: z.string().max(128).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const event = await getEventByInviteCode(parsed.data.code);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (await isEventMember(event.id, user.id)) {
    return NextResponse.json({ error: "Already joined" }, { status: 409 });
  }

  const members = await listEventMembers(event.id);
  if (
    exceedsGuestCap(members, {
      userId: user.id,
      status: "going",
      maxGuests: event.max_guest_count,
    })
  ) {
    return NextResponse.json({ error: "event_full" }, { status: 409 });
  }

  const env = await getEnv();
  if (!eventPaymentsEnabled(event, env.STRIPE_SECRET_KEY)) {
    return NextResponse.json({ error: "Payments not available" }, { status: 503 });
  }

  const locale = request.nextUrl.searchParams.get("locale") ?? "en";

  try {
    const session = await createEventCheckoutSession({
      event,
      userId: user.id,
      inviteCode: parsed.data.code,
      locale,
      referrerUserId: parsed.data.referrer_user_id,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
    }

    await createPendingEventPayment({
      id: nanoid(),
      eventId: event.id,
      userId: user.id,
      stripeCheckoutSessionId: session.id,
      amountCents: event.ticket_price_cents!,
      currency: event.ticket_currency ?? "UZS",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
