import { getDb } from "@/lib/cloudflare";
import { joinEvent, isEventMember } from "@/lib/db/queries";
import type { Event, EventRsvpStatus, User } from "@/types";

export async function upsertEventRsvp(
  eventId: string,
  userId: string,
  status: EventRsvpStatus,
  additionalGuestCount = 0,
) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO event_rsvps (event_id, user_id, status, additional_guest_count, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(event_id, user_id) DO UPDATE SET
         status = excluded.status,
         additional_guest_count = excluded.additional_guest_count,
         updated_at = datetime('now')`,
    )
    .bind(eventId, userId, status, additionalGuestCount)
    .run();
}

export async function getEventRsvpStatus(
  eventId: string,
  userId: string,
): Promise<EventRsvpStatus | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT status FROM event_rsvps WHERE event_id = ? AND user_id = ?")
    .bind(eventId, userId)
    .first<{ status: EventRsvpStatus }>();
  return row?.status ?? null;
}

export async function getEventRsvp(
  eventId: string,
  userId: string,
): Promise<{ status: EventRsvpStatus; additional_guest_count: number } | null> {
  const db = await getDb();
  const row = await db
    .prepare(
      "SELECT status, COALESCE(additional_guest_count, 0) AS additional_guest_count FROM event_rsvps WHERE event_id = ? AND user_id = ?",
    )
    .bind(eventId, userId)
    .first<{ status: EventRsvpStatus; additional_guest_count: number }>();
  return row ?? null;
}

export async function rsvpGoing(event: Event, user: User) {
  const wasMember = await isEventMember(event.id, user.id);
  const previousRsvp = await getEventRsvp(event.id, user.id);
  await joinEvent(event.id, user.id);
  await upsertEventRsvp(
    event.id,
    user.id,
    "going",
    previousRsvp?.additional_guest_count ?? 0,
  );
  return { wasMember, joined: true };
}

export async function rsvpMaybe(event: Event, user: User) {
  const wasMember = await isEventMember(event.id, user.id);
  const previousRsvp = await getEventRsvp(event.id, user.id);
  await joinEvent(event.id, user.id);
  await upsertEventRsvp(
    event.id,
    user.id,
    "maybe",
    previousRsvp?.additional_guest_count ?? 0,
  );
  return { wasMember, joined: true };
}

export async function rsvpDeclined(eventId: string, userId: string) {
  await upsertEventRsvp(eventId, userId, "declined", 0);
}
