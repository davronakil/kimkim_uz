import { intlLocale, isLocale } from "@/lib/locale";
import type { Locale } from "@/i18n/config";

/**
 * Every event carries the IANA zone its wall-clock time was entered in, and
 * `starts_at` / `ends_at` are always stored as canonical UTC instants. Anything
 * that reads those columns must format them back through the event timezone —
 * the runtime timezone on Cloudflare Workers is UTC, so relying on it silently
 * shifts every label and reminder.
 */
export const DEFAULT_EVENT_TIMEZONE = "Asia/Tashkent";

const WALL_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(value: string | null | undefined): string {
  return isValidTimeZone(value) ? value : DEFAULT_EVENT_TIMEZONE;
}

export function detectBrowserTimeZone(): string {
  try {
    return resolveTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return DEFAULT_EVENT_TIMEZONE;
  }
}

export function supportedTimeZones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return supported.length > 0 ? [...supported] : [DEFAULT_EVENT_TIMEZONE, "UTC"];
}

function zoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour) % 24,
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  };
}

/** Milliseconds to add to a UTC instant to get the zone's wall-clock reading. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = zoneParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Turn a `YYYY-MM-DDTHH:MM` reading in `timeZone` into the UTC instant it names.
 * Resolved twice because the offset itself depends on the instant across DST
 * transitions.
 */
export function wallClockToUtc(wallClock: string, timeZone: string): Date | null {
  const match = wallClock.trim().match(WALL_CLOCK_PATTERN);
  if (!match) return null;

  const zone = resolveTimeZone(timeZone);
  const naiveUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    match[6] ? Number(match[6]) : 0,
  );
  if (Number.isNaN(naiveUtc)) return null;

  let instant = naiveUtc - zoneOffsetMs(new Date(naiveUtc), zone);
  instant = naiveUtc - zoneOffsetMs(new Date(instant), zone);

  const resolved = new Date(instant);
  return Number.isNaN(resolved.getTime()) ? null : resolved;
}

/** `YYYY-MM-DDTHH:MM:SSZ` — sorts lexicographically and parses in SQLite. */
export function toUtcTimestamp(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

/**
 * Accepts either an absolute timestamp (anything `Date` understands, including
 * the `...Z` values we store) or a bare wall-clock reading, and returns the
 * canonical UTC form. Bare readings are interpreted in `timeZone`.
 */
export function normalizeEventTimestamp(
  value: string | null | undefined,
  timeZone: string,
): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  if (WALL_CLOCK_PATTERN.test(raw)) {
    const converted = wallClockToUtc(raw, timeZone);
    return converted ? toUtcTimestamp(converted) : null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : toUtcTimestamp(parsed);
}

/** `YYYY-MM-DDTHH:MM` in `timeZone`, for `<input type="datetime-local">`. */
export function toDatetimeLocalValue(
  value: string | null | undefined,
  timeZone: string,
): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = zoneParts(date, resolveTimeZone(timeZone));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function resolveIntlLocale(locale: Locale | string): string {
  return isLocale(locale) ? intlLocale(locale) : intlLocale("en");
}

export function formatEventDateTime(
  value: string | Date,
  locale: Locale | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    ...options,
    timeZone: resolveTimeZone(timeZone),
  }).format(date);
}

/** Short zone label (`CDT`, `GMT+5`) so a time is never ambiguous in a notification. */
export function timeZoneAbbreviation(
  value: string | Date,
  locale: Locale | string,
  timeZone: string,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    timeZone: resolveTimeZone(timeZone),
    timeZoneName: "short",
  }).formatToParts(date);

  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
}

/** Date and time plus the zone label, e.g. `Sep 28, 2026, 9:00 PM CDT`. */
export function formatEventDateTimeWithZone(
  value: string | Date,
  locale: Locale | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  const formatted = formatEventDateTime(value, locale, timeZone, options);
  if (!formatted) return "";

  const abbreviation = timeZoneAbbreviation(value, locale, timeZone);
  return abbreviation ? `${formatted} ${abbreviation}` : formatted;
}
