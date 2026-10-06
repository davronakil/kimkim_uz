import assert from "node:assert/strict";
import {
  buildEventIcs,
  calendarFilename,
  escapeIcsText,
  foldIcsLine,
  formatIcsUtc,
} from "./calendar";

assert.equal(escapeIcsText("Hello, world; yes\\no\nnext"), "Hello\\, world\\; yes\\\\no\\nnext");

assert.equal(foldIcsLine("SHORT"), "SHORT");
const long = `DESCRIPTION:${"a".repeat(90)}`;
const folded = foldIcsLine(long);
assert.ok(folded.includes("\r\n "));
assert.ok(folded.split("\r\n").every((line) => line.length <= 75));

assert.equal(
  formatIcsUtc("2026-09-28T16:00:00Z", "Asia/Tashkent"),
  "20260928T160000Z",
);

// Wall-clock leftover from pre-UTC migration: 21:00 Asia/Tashkent = 16:00Z
assert.equal(
  formatIcsUtc("2026-09-28T21:00:00", "Asia/Tashkent"),
  "20260928T160000Z",
);

assert.equal(calendarFilename("Gap circle — Tashkent!"), "gap-circle-tashkent.ics");
assert.equal(calendarFilename("!!!"), "event.ics");

const ics = buildEventIcs(
  {
    id: "evt_123",
    title: "Friday gap",
    description: "Bring tea,\nand chairs;",
    starts_at: "2026-09-28T16:00:00Z",
    ends_at: "2026-09-28T18:00:00Z",
    timezone: "Asia/Tashkent",
    location_name: "Choyxona",
    location_address: "Amir Temur, Tashkent",
    url: "https://kimkim.uz/uz/events/evt_123",
  },
  new Date("2026-09-01T12:00:00Z"),
);

assert.ok(ics.includes("BEGIN:VCALENDAR"));
assert.ok(ics.includes("DTSTART:20260928T160000Z"));
assert.ok(ics.includes("DTEND:20260928T180000Z"));
assert.ok(ics.includes("X-WR-TIMEZONE:Asia/Tashkent"));
assert.ok(ics.includes("SUMMARY:Friday gap"));
assert.ok(ics.includes("DESCRIPTION:Bring tea\\,\\nand chairs\\;"));
assert.ok(ics.includes("LOCATION:Choyxona\\, Amir Temur\\, Tashkent"));
assert.ok(ics.includes("UID:evt_123@kimkim.uz"));
assert.ok(ics.includes("URL:https://kimkim.uz/uz/events/evt_123"));
assert.ok(ics.endsWith("\r\n"));

// Missing end → default 2h duration from start
const openEnded = buildEventIcs(
  {
    id: "evt_open",
    title: "Open",
    starts_at: "2026-09-28T16:00:00Z",
    timezone: "Asia/Tashkent",
  },
  new Date("2026-09-01T12:00:00Z"),
);
assert.ok(openEnded.includes("DTEND:20260928T180000Z"));

console.log("calendar.test.ts: ok");
