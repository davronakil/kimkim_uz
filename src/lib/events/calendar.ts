import { eventInstant, resolveTimeZone } from "@/lib/events/timezone";

export type CalendarEventInput = {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  timezone: string;
  location_name?: string | null;
  location_address?: string | null;
  /** Absolute URL shown in the calendar entry. */
  url?: string | null;
};

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/** RFC 5545 TEXT escaping. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold long content lines at 75 octets (ASCII-safe for our fields). */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;

  const chunks: string[] = [];
  let remaining = line;
  let first = true;
  while (remaining.length > 0) {
    const limit = first ? 75 : 74;
    if (remaining.length <= limit) {
      chunks.push(first ? remaining : ` ${remaining}`);
      break;
    }
    chunks.push(first ? remaining.slice(0, limit) : ` ${remaining.slice(0, limit)}`);
    remaining = remaining.slice(limit);
    first = false;
  }
  return chunks.join("\r\n");
}

/** `YYYYMMDDTHHMMSSZ` from a Date or stored event instant. */
export function formatIcsUtc(value: string | Date, timeZone: string): string {
  const date = value instanceof Date ? value : eventInstant(value, timeZone);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`;
}

function resolveEndInstant(input: CalendarEventInput): Date {
  const zone = resolveTimeZone(input.timezone);
  const start = eventInstant(input.starts_at, zone);
  if (input.ends_at) {
    const end = eventInstant(input.ends_at, zone);
    if (!Number.isNaN(end.getTime()) && end.getTime() > start.getTime()) {
      return end;
    }
  }
  return new Date(start.getTime() + DEFAULT_DURATION_MS);
}

function buildLocation(input: CalendarEventInput): string {
  return [input.location_name, input.location_address]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

export function calendarFilename(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  return `${slug || "event"}.ics`;
}

/**
 * Build a timezone-correct `.ics` payload.
 *
 * `starts_at` / `ends_at` are stored as UTC instants; we emit them with a `Z`
 * suffix so every calendar client lands on the same moment regardless of the
 * viewer's zone. The event's IANA zone is kept as `X-WR-TIMEZONE` for clients
 * that surface an organizer zone label.
 */
export function buildEventIcs(input: CalendarEventInput, now = new Date()): string {
  const zone = resolveTimeZone(input.timezone);
  const start = eventInstant(input.starts_at, zone);
  const end = resolveEndInstant(input);
  const stamp = formatIcsUtc(now, "UTC");
  const dtStart = formatIcsUtc(start, zone);
  const dtEnd = formatIcsUtc(end, zone);
  const location = buildLocation(input);
  const description = input.description?.trim() ?? "";
  const url = input.url?.trim() ?? "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KimKim//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${zone}`,
    "BEGIN:VEVENT",
    `UID:${input.id}@kimkim.uz`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  }
  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }
  if (url) {
    lines.push(`URL:${escapeIcsText(url)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR", "");

  return lines.map(foldIcsLine).join("\r\n");
}

export function downloadEventIcs(input: CalendarEventInput) {
  if (typeof document === "undefined") return;

  const ics = buildEventIcs(input);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = calendarFilename(input.title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}
