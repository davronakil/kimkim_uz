import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, getMediaBucket } from "@/lib/cloudflare";
import { listUserEvents } from "@/lib/db/queries";

const createEventSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(5000).optional(),
  starts_at: z.string(),
  ends_at: z.string().optional(),
  location_name: z.string().optional(),
  location_address: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
});

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
  const payload = createEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at") || undefined,
    location_name: formData.get("location_name") || undefined,
    location_address: formData.get("location_address") || undefined,
    location_lat: formData.get("location_lat")
      ? Number(formData.get("location_lat"))
      : undefined,
    location_lng: formData.get("location_lng")
      ? Number(formData.get("location_lng"))
      : undefined,
  });

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid event data" }, { status: 400 });
  }

  const db = await getDb();
  const eventId = nanoid();
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
        location_name, location_address, location_lat, location_lng, cover_image_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
