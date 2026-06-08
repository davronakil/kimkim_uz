import { nanoid } from "nanoid";
import { getDb } from "@/lib/cloudflare";
import { defaultPaymentMode, type EventPaymentMode } from "@/lib/events/payment-mode";
import { generateInviteCode } from "@/lib/utils";

export type CreateEventInput = {
  creatorId: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  coverImageKey?: string | null;
  paymentMode?: EventPaymentMode;
  ticketPriceCents?: number | null;
  ticketCurrency?: string;
};

export async function createEventRecord(input: CreateEventInput) {
  const db = await getDb();
  const eventId = nanoid();
  const inviteCode = generateInviteCode();
  const paymentMode = input.paymentMode ?? defaultPaymentMode;

  await db
    .prepare(
      `INSERT INTO events (
        id, creator_id, title, description, starts_at, ends_at,
        location_name, location_address, location_lat, location_lng, cover_image_key,
        payment_mode, ticket_price_cents, ticket_currency, invite_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      eventId,
      input.creatorId,
      input.title,
      input.description ?? null,
      input.startsAt,
      input.endsAt ?? null,
      input.locationName ?? null,
      input.locationAddress ?? null,
      input.locationLat ?? null,
      input.locationLng ?? null,
      input.coverImageKey ?? null,
      paymentMode,
      input.ticketPriceCents ?? null,
      input.ticketCurrency ?? "UZS",
      inviteCode,
    )
    .run();

  await db
    .prepare(
      "INSERT INTO event_members (event_id, user_id, role) VALUES (?, ?, 'owner')",
    )
    .bind(eventId, input.creatorId)
    .run();

  return { eventId, inviteCode };
}
