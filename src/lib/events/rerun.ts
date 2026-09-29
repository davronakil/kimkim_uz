import type { Event } from "@/types";
import { createEventRecord } from "@/lib/events/create";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Same weekday and clock as the original, at least one week ahead of now. */
export function nextWeeklyOccurrence(iso: string, from = new Date()): string {
  const original = new Date(iso);
  if (Number.isNaN(original.getTime())) {
    throw new Error("Invalid starts_at");
  }

  let nextMs = original.getTime() + WEEK_MS;
  const nowMs = from.getTime();
  while (nextMs <= nowMs) {
    nextMs += WEEK_MS;
  }

  return new Date(nextMs).toISOString();
}

export function shiftBySameDelta(
  originalStartIso: string,
  nextStartIso: string,
  originalEndIso: string | null | undefined,
): string | null {
  if (!originalEndIso) return null;
  const originalStart = new Date(originalStartIso).getTime();
  const nextStart = new Date(nextStartIso).getTime();
  const originalEnd = new Date(originalEndIso).getTime();
  if (
    Number.isNaN(originalStart) ||
    Number.isNaN(nextStart) ||
    Number.isNaN(originalEnd)
  ) {
    return null;
  }
  return new Date(originalEnd + (nextStart - originalStart)).toISOString();
}

export async function rerunEventRecord(source: Event, creatorId: string) {
  const startsAt = nextWeeklyOccurrence(source.starts_at);
  const endsAt = shiftBySameDelta(source.starts_at, startsAt, source.ends_at);

  return createEventRecord({
    creatorId,
    title: source.title,
    description: source.description,
    startsAt,
    endsAt,
    locationName: source.location_name,
    locationAddress: source.location_address,
    locationLat: source.location_lat,
    locationLng: source.location_lng,
    coverImageKey: source.cover_image_key,
    paymentMode: source.payment_mode,
    expensesEnabled: source.expenses_enabled,
    expenseCurrency: source.expense_currency,
    ticketPriceCents: source.ticket_price_cents,
    ticketCurrency: source.ticket_currency,
    visibility: source.visibility,
    maxGuestCount: source.max_guest_count,
  });
}
