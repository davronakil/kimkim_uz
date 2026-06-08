import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, getMediaBucket } from "@/lib/cloudflare";
import { listUserEvents } from "@/lib/db/queries";
import { parseEventFormData } from "@/lib/events/form";
import { generateInviteCode } from "@/lib/utils";

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

  const db = await getDb();
  const eventId = nanoid();
  const inviteCode = generateInviteCode();
  let coverImageKey: string | null = null;

  const cover = formData.get("cover_image");
  if (cover instanceof File && cover.size > 0) {
    const media = await getMediaBucket();
    coverImageKey = `events/${eventId}/${cover.name}`;
    await media.put(coverImageKey, cover.stream(), {
      httpMetadata: { contentType: cover.type || "image/jpeg" },
    });
  }

  await db
    .prepare(
      `INSERT INTO events (
        id, creator_id, title, description, starts_at, ends_at,
        location_name, location_address, location_lat, location_lng, cover_image_key, invite_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      eventId,
      user.id,
      payload.data.title,
      payload.data.description ?? null,
      payload.data.starts_at,
      payload.data.ends_at ?? null,
      payload.data.location_name ?? null,
      payload.data.location_address ?? null,
      payload.data.location_lat ?? null,
      payload.data.location_lng ?? null,
      coverImageKey,
      inviteCode,
    )
    .run();

  await db
    .prepare(
      "INSERT INTO event_members (event_id, user_id, role) VALUES (?, ?, 'owner')",
    )
    .bind(eventId, user.id)
    .run();

  return NextResponse.json({ id: eventId });
}
