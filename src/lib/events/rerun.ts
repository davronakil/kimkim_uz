import type { Event } from "@/types";
import { createEventRecord } from "@/lib/events/create";
import {
  resolveTimeZone,
  toDatetimeLocalValue,
  toUtcTimestamp,
  wallClockToUtc,
} from "@/lib/events/timezone";

const DAY_MS = 24 * 60 * 60 * 1000;

function wallParts(wall: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const match = wall.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

/**
 * Move a UTC instant by whole calendar days while keeping the same clock
 * reading in `timeZone`. Adding 7×24h of absolute time shifts that clock by
 * an hour whenever the span crosses a daylight-saving change.
 */
export function addCalendarDays(iso: string, days: number, timeZone: string): string {
  const zone = resolveTimeZone(timeZone);
  const parts = wallParts(toDatetimeLocalValue(iso, zone));
  if (!parts) {
    return toUtcTimestamp(new Date(new Date(iso).getTime() + days * DAY_MS));
  }

  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, parts.hour, parts.minute));
  const pad = (n: number) => String(n).padStart(2, "0");
  const nextWall = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
  const instant = wallClockToUtc(nextWall, zone);
  if (!instant) {
    return toUtcTimestamp(new Date(new Date(iso).getTime() + days * DAY_MS));
  }
  return toUtcTimestamp(instant);
}

/** Same weekday and clock as the original, at least one week ahead of now. */
export function nextWeeklyOccurrence(iso: string, timeZone: string, from = new Date()): string {
  const original = new Date(iso);
  if (Number.isNaN(original.getTime())) {
    throw new Error("Invalid starts_at");
  }

  const zone = resolveTimeZone(timeZone);
  let weeks = 1;
  let next = addCalendarDays(iso, weeks * 7, zone);
  const nowMs = from.getTime();
  while (new Date(next).getTime() <= nowMs) {
    weeks += 1;
    if (weeks > 520) break;
    next = addCalendarDays(iso, weeks * 7, zone);
  }

  return next;
}

export function shiftBySameDelta(
  originalStartIso: string,
  nextStartIso: string,
  originalEndIso: string | null | undefined,
  timeZone: string,
): string | null {
  if (!originalEndIso) return null;
  const zone = resolveTimeZone(timeZone);
  const start = wallParts(toDatetimeLocalValue(originalStartIso, zone));
  const next = wallParts(toDatetimeLocalValue(nextStartIso, zone));
  if (!start || !next) return null;

  const startDay = Date.UTC(start.year, start.month - 1, start.day);
  const nextDay = Date.UTC(next.year, next.month - 1, next.day);
  const days = Math.round((nextDay - startDay) / DAY_MS);
  return addCalendarDays(originalEndIso, days, zone);
}

export async function rerunEventRecord(source: Event, creatorId: string) {
  const timezone = resolveTimeZone(source.timezone);
  const startsAt = nextWeeklyOccurrence(source.starts_at, timezone);
  const endsAt = shiftBySameDelta(source.starts_at, startsAt, source.ends_at, timezone);

  return createEventRecord({
    creatorId,
    title: source.title,
    description: source.description,
    startsAt,
    endsAt,
    timezone,
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
