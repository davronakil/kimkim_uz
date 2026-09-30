import {
  resolveTimeZone,
  toUtcTimestamp,
  wallClockToUtc,
} from "@/lib/events/timezone";
import type { BotLocale } from "@/lib/telegram/types";

/** "Today"/"tomorrow" have to be resolved against the organizer's own calendar day. */
function zonedNowParts(timeZone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

function toUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const wallClock = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
  const parsed = wallClockToUtc(wallClock, timeZone);
  return parsed ? toUtcTimestamp(parsed) : null;
}

function parseClock(value: string): { hour: number; minute: number } | null {
  const match = value.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function parseEventDateTime(
  input: string,
  locale: BotLocale,
  timeZone: string,
): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const zone = resolveTimeZone(timeZone);
  const lower = raw.toLowerCase();
  const now = zonedNowParts(zone);

  const relativeMatch = lower.match(/^(today|bugun|сегодня|tomorrow|ertaga|завтра)\s+(.+)$/i);
  if (relativeMatch) {
    const clock = parseClock(relativeMatch[2]);
    if (!clock) return null;
    const dayWord = relativeMatch[1];
    const isTomorrow =
      dayWord === "tomorrow" || dayWord === "ertaga" || dayWord === "завтра";
    const base = new Date(Date.UTC(now.year, now.month - 1, now.day + (isTomorrow ? 1 : 0)));
    return toUtcIso(
      base.getUTCFullYear(),
      base.getUTCMonth() + 1,
      base.getUTCDate(),
      clock.hour,
      clock.minute,
      zone,
    );
  }

  const dotted = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})(?:\s+(\d{1,2})[:.](\d{2}))?$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    let year = Number(dotted[3]);
    if (year < 100) year += 2000;
    const hour = dotted[4] ? Number(dotted[4]) : 19;
    const minute = dotted[5] ? Number(dotted[5]) : 0;
    return toUtcIso(year, month, day, hour, minute, zone);
  }

  const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2})[:.](\d{2}))?$/);
  if (dashed) {
    const hour = dashed[4] ? Number(dashed[4]) : 19;
    const minute = dashed[5] ? Number(dashed[5]) : 0;
    return toUtcIso(
      Number(dashed[1]),
      Number(dashed[2]),
      Number(dashed[3]),
      hour,
      minute,
      zone,
    );
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    // Without an explicit offset the runtime reads the text as its own local
    // time, so re-anchor the wall clock the organizer actually typed.
    if (/(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})\s*$/i.test(raw)) return toUtcTimestamp(parsed);
    return toUtcIso(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
      parsed.getHours(),
      parsed.getMinutes(),
      zone,
    );
  }

  if ((locale === "uz" && lower.includes("ertaga")) || (locale === "ru" && lower.includes("завтра"))) {
    const clock = parseClock(raw);
    if (clock) {
      const base = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
      return toUtcIso(
        base.getUTCFullYear(),
        base.getUTCMonth() + 1,
        base.getUTCDate(),
        clock.hour,
        clock.minute,
        zone,
      );
    }
  }

  return null;
}

export function isSkipInput(text: string) {
  const lower = text.trim().toLowerCase();
  return [
    "skip",
    "-",
    "o'tkazib yuborish",
    "otkazib yuborish",
    "yo'q",
    "yoq",
    "пропустить",
    "нет",
    "нету",
  ].includes(lower);
}
