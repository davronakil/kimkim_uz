import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEnv, runInBackground } from "@/lib/cloudflare";
import { getCurrentUser } from "@/lib/auth/session";
import { notifyMemberJoined } from "@/lib/telegram/notifications";
import { getEventRsvp, upsertEventRsvp } from "@/lib/events/rsvp";
import {
  getEventByInviteCode,
  hasCompletedEventPayment,
  isEventMember,
  joinEvent,
  listEventMembers,
} from "@/lib/db/queries";
import { eventPaymentsEnabled } from "@/lib/stripe/checkout";

const joinSchema = z.object({
  code: z.string().min(4).max(32),
  pay_later: z.boolean().optional(),
  rsvp_status: z.enum(["going", "maybe", "declined"]).optional(),
});

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const event = await getEventByInviteCode(code);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const members = await listEventMembers(event.id);
  const user = await getCurrentUser();
  const joined = user ? await isEventMember(event.id, user.id) : false;
  const env = await getEnv();
  const paymentsEnabled = eventPaymentsEnabled(event, env.STRIPE_SECRET_KEY);
  const hasPaid = user ? await hasCompletedEventPayment(event.id, user.id) : false;
  const rsvpStatus = user ? await getEventRsvp(event.id, user.id) : null;

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      starts_at: event.starts_at,
      location_name: event.location_name,
      location_address: event.location_address,
      location_lat: event.location_lat,
      location_lng: event.location_lng,
      cover_image_key: event.cover_image_key,
      payment_mode: event.payment_mode ?? "free",
      ticket_price_cents: event.ticket_price_cents,
      ticket_currency: event.ticket_currency ?? "UZS",
      invite_code: event.invite_code,
    },
    member_count: members.length,
    joined,
    logged_in: Boolean(user),
    payments_enabled: paymentsEnabled,
    has_paid: hasPaid,
    rsvp_status: rsvpStatus,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = joinSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const event = await getEventByInviteCode(parsed.data.code);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rsvpStatus = parsed.data.rsvp_status ?? "going";

  if (rsvpStatus === "declined") {
    await upsertEventRsvp(event.id, user.id, "declined");
    return NextResponse.json({ event_id: event.id, joined: false });
  }

  const env = await getEnv();
  if (
    rsvpStatus === "going" &&
    eventPaymentsEnabled(event, env.STRIPE_SECRET_KEY) &&
    !parsed.data.pay_later
  ) {
    const paid = await hasCompletedEventPayment(event.id, user.id);
    if (!paid) {
      return NextResponse.json({ error: "Payment required" }, { status: 402 });
    }
  }

  const alreadyMember = await isEventMember(event.id, user.id);
  await joinEvent(event.id, user.id);
  await upsertEventRsvp(event.id, user.id, rsvpStatus);

  if (!alreadyMember) {
    void runInBackground(
      notifyMemberJoined({
        eventId: event.id,
        member: user,
        memberUserId: user.id,
      }),
    );
  }

  return NextResponse.json({ event_id: event.id });
}
