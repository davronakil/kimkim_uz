import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, getMediaBucket } from "@/lib/cloudflare";
import { listUserEvents } from "@/lib/db/queries";
import { createEventRecord } from "@/lib/events/create";
import { parseEventFormData, resolveTicketPriceCents } from "@/lib/events/form";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await listUserEvents(user.id);
  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const payload = parseEventFormData(formData);

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid event data" }, { status: 400 });
  }

  const { eventId } = await createEventRecord({
    creatorId: user.id,
    title: payload.data.title,
    description: payload.data.description ?? null,
    startsAt: payload.data.starts_at,
    endsAt: payload.data.ends_at ?? null,
    locationName: payload.data.location_name ?? null,
    locationAddress: payload.data.location_address ?? null,
    locationLat: payload.data.location_lat ?? null,
    locationLng: payload.data.location_lng ?? null,
    paymentMode: payload.data.payment_mode,
    ticketPriceCents: resolveTicketPriceCents(
      payload.data.payment_mode,
      payload.data.ticket_price,
    ),
    ticketCurrency: payload.data.payment_mode === "paid" ? payload.data.ticket_currency : "UZS",
    visibility: payload.data.visibility,
  });

  const cover = formData.get("cover_image");
  if (cover instanceof File && cover.size > 0) {
    const media = await getMediaBucket();
    const coverImageKey = `events/${eventId}/${cover.name}`;
    await media.put(coverImageKey, cover.stream(), {
      httpMetadata: { contentType: cover.type || "image/jpeg" },
    });

    const db = await getDb();
    await db
      .prepare("UPDATE events SET cover_image_key = ? WHERE id = ?")
      .bind(coverImageKey, eventId)
      .run();
  }

  return NextResponse.json({ id: eventId });
}
