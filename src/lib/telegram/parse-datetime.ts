import type { BotLocale } from "@/lib/telegram/types";

const TASHKENT_TZ = "Asia/Tashkent";

function tashkentParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TASHKENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function toTashkentIso(year: number, month: number, day: number, hour: number, minute: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+05:00`;
  const parsed = new Date(local);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseClock(value: string): { hour: number; minute: number } | null {
  const match = value.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function parseEventDateTime(input: string, locale: BotLocale): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const now = tashkentParts();

  const relativeMatch = lower.match(/^(today|bugun|сегодня|tomorrow|ertaga|завтра)\s+(.+)$/i);
  if (relativeMatch) {
    const clock = parseClock(relativeMatch[2]);
    if (!clock) return null;
    const dayWord = relativeMatch[1];
    const isTomorrow =
      dayWord === "tomorrow" || dayWord === "ertaga" || dayWord === "завтра";
    const base = new Date(Date.UTC(now.year, now.month - 1, now.day + (isTomorrow ? 1 : 0)));
    return toTashkentIso(
      base.getUTCFullYear(),
      base.getUTCMonth() + 1,
      base.getUTCDate(),
      clock.hour,
      clock.minute,
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
    return toTashkentIso(year, month, day, hour, minute);
  }

  const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2})[:.](\d{2}))?$/);
  if (dashed) {
    const hour = dashed[4] ? Number(dashed[4]) : 19;
    const minute = dashed[5] ? Number(dashed[5]) : 0;
    return toTashkentIso(
      Number(dashed[1]),
      Number(dashed[2]),
      Number(dashed[3]),
      hour,
      minute,
    );
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  if ((locale === "uz" && lower.includes("ertaga")) || (locale === "ru" && lower.includes("завтра"))) {
    const clock = parseClock(raw);
    if (clock) {
      const base = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
      return toTashkentIso(
        base.getUTCFullYear(),
        base.getUTCMonth() + 1,
        base.getUTCDate(),
        clock.hour,
        clock.minute,
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
