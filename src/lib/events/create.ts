import { nanoid } from "nanoid";
import { getDb } from "@/lib/cloudflare";
import {
  areExpensesEnabledByDefault,
  defaultPaymentMode,
  type EventPaymentMode,
} from "@/lib/events/payment-mode";
import { resolveTimeZone } from "@/lib/events/timezone";
import { defaultEventVisibility, type EventVisibility } from "@/lib/events/visibility";
import { generateInviteCode } from "@/lib/utils";

export type CreateEventInput = {
  creatorId: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  timezone?: string;
  locationName?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  coverImageKey?: string | null;
  paymentMode?: EventPaymentMode;
  expensesEnabled?: boolean;
  expenseCurrency?: string;
  ticketPriceCents?: number | null;
  ticketCurrency?: string;
  visibility?: EventVisibility;
  maxGuestCount?: number | null;
};

export async function createEventRecord(input: CreateEventInput) {
  const db = await getDb();
  const eventId = nanoid();
  const inviteCode = generateInviteCode();
  const paymentMode = input.paymentMode ?? defaultPaymentMode;
  const expensesEnabled =
    input.expensesEnabled ?? areExpensesEnabledByDefault(paymentMode);
  const visibility = input.visibility ?? defaultEventVisibility;

  await db
    .prepare(
      `INSERT INTO events (
        id, creator_id, title, description, starts_at, ends_at, timezone,
        location_name, location_address, location_lat, location_lng, cover_image_key,
        payment_mode, expenses_enabled, expense_currency, ticket_price_cents, ticket_currency,
        invite_code, visibility, max_guest_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      eventId,
      input.creatorId,
      input.title,
      input.description ?? null,
      input.startsAt,
      input.endsAt ?? null,
      resolveTimeZone(input.timezone),
      input.locationName ?? null,
      input.locationAddress ?? null,
      input.locationLat ?? null,
      input.locationLng ?? null,
      input.coverImageKey ?? null,
      paymentMode,
      expensesEnabled ? 1 : 0,
      input.expenseCurrency ?? "UZS",
      input.ticketPriceCents ?? null,
      input.ticketCurrency ?? "UZS",
      inviteCode,
      visibility,
      input.maxGuestCount ?? null,
    )
    .run();

  await db
    .prepare(
      "INSERT INTO event_members (event_id, user_id, role) VALUES (?, ?, 'owner')",
    )
    .bind(eventId, input.creatorId)
    .run();

  await db
    .prepare(
      `INSERT INTO event_rsvps (event_id, user_id, status, updated_at)
       VALUES (?, ?, 'going', datetime('now'))`,
    )
    .bind(eventId, input.creatorId)
    .run();

  return { eventId, inviteCode };
}
