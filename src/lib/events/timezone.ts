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
  if (Number.isNaN(resolved.getTime())) return null;

  // A spring-forward gap has no such wall clock. The two-pass guess lands on
  // the earlier offset; move forward by the missing hour so 2:30 becomes 3:30
  // instead of 1:30. Ambiguous fall-back times already round-trip, so they stay.
  const asked = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: match[6] ? Number(match[6]) : 0,
  };
  const got = zoneParts(resolved, zone);
  const same =
    asked.year === got.year &&
    asked.month === got.month &&
    asked.day === got.day &&
    asked.hour === got.hour &&
    asked.minute === got.minute &&
    asked.second === got.second;
  if (same) return resolved;

  const askedMs = Date.UTC(asked.year, asked.month - 1, asked.day, asked.hour, asked.minute, asked.second);
  const gotMs = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second);
  const delta = askedMs - gotMs;
  if (Math.abs(delta) > 3 * 60 * 60 * 1000) return resolved;

  const adjusted = new Date(resolved.getTime() + delta);
  return Number.isNaN(adjusted.getTime()) ? resolved : adjusted;
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

/**
 * Absolute instants (`...Z` or an offset) parse as themselves. A bare
 * wall-clock reading left over from before the UTC migration is read in the
 * event zone, which is how it was typed.
 */
export function eventInstant(value: string | Date, timeZone: string): Date {
  if (value instanceof Date) return value;
  const raw = value.trim();
  if (WALL_CLOCK_PATTERN.test(raw)) {
    return wallClockToUtc(raw, timeZone) ?? new Date(raw);
  }
  return new Date(raw);
}

/** `YYYY-MM-DDTHH:MM` in `timeZone`, for `<input type="datetime-local">`. */
export function toDatetimeLocalValue(
  value: string | null | undefined,
  timeZone: string,
): string {
  if (!value) return "";
  const date = eventInstant(value, timeZone);
  if (Number.isNaN(date.getTime())) return "";

  const parts = zoneParts(date, resolveTimeZone(timeZone));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function resolveIntlLocale(locale: Locale | string): string {
  return isLocale(locale) ? intlLocale(locale) : intlLocale("en");
}

type DateLang = "en" | "uz" | "ru";

const WEEKDAYS_LONG: Record<DateLang, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  uz: ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"],
  ru: ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"],
};

const MONTHS_LONG: Record<DateLang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
};

const MONTHS_SHORT: Record<DateLang, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  uz: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
  ru: ["янв.", "февр.", "март", "апр.", "май", "июнь", "июль", "авг.", "сент.", "окт.", "нояб.", "дек."],
};

function dateLang(locale: Locale | string): DateLang {
  if (locale === "uz" || locale === "ru") return locale;
  return "en";
}

function formatClock(hour: number, minute: number, lang: DateLang): string {
  const minutes = String(minute).padStart(2, "0");
  if (lang !== "en") return `${String(hour).padStart(2, "0")}:${minutes}`;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

/**
 * Built from calendar parts instead of `Intl` date styles. Chrome's Uzbek
 * locale data renders `2026 M10 3`, which did not match the server text and
 * broke hydration.
 */
export function formatEventDateTime(
  value: string | Date,
  locale: Locale | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  const date = eventInstant(value, timeZone);
  if (Number.isNaN(date.getTime())) return "";

  const zone = resolveTimeZone(timeZone);
  const parts = zoneParts(date, zone);
  const lang = dateLang(locale);
  const weekdayIndex = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const weekday = WEEKDAYS_LONG[lang][weekdayIndex];
  const monthLong = MONTHS_LONG[lang][parts.month - 1];
  const monthShort = MONTHS_SHORT[lang][parts.month - 1];
  const longDate = options.dateStyle === "full" || options.weekday === "long" || options.month === "long";
  const includeYear = options.dateStyle != null;
  const showTime = options.timeStyle != null || options.hour != null || options.minute != null;
  const clock = showTime ? formatClock(parts.hour, parts.minute, lang) : "";

  if (lang === "en") {
    if (longDate && includeYear) {
      return `${weekday}, ${monthLong} ${parts.day}, ${parts.year}${showTime ? ` at ${clock}` : ""}`;
    }
    if (longDate) return `${weekday}, ${monthLong} ${parts.day}${showTime ? ` at ${clock}` : ""}`;
    return `${monthShort} ${parts.day}, ${parts.year}${showTime ? `, ${clock}` : ""}`;
  }

  if (lang === "uz") {
    const month = longDate ? monthLong : monthShort;
    if (!includeYear && longDate) return `${weekday}, ${parts.day}-${month}${showTime ? `, ${clock}` : ""}`;
    if (longDate) return `${weekday}, ${parts.day}-${month}, ${parts.year}${showTime ? `, ${clock}` : ""}`;
    return `${parts.day}-${month}, ${parts.year}${showTime ? `, ${clock}` : ""}`;
  }

  if (!includeYear && longDate) return `${weekday}, ${parts.day} ${monthLong}${showTime ? ` в ${clock}` : ""}`;
  if (longDate) return `${weekday}, ${parts.day} ${monthLong} ${parts.year} г.${showTime ? ` в ${clock}` : ""}`;
  return `${parts.day} ${monthShort} ${parts.year} г.${showTime ? `, ${clock}` : ""}`;
}

/** Short zone label (`CDT`, `GMT+5`) so a time is never ambiguous in a notification. */
export function timeZoneAbbreviation(
  value: string | Date,
  locale: Locale | string,
  timeZone: string,
): string {
  const date = eventInstant(value, timeZone);
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
