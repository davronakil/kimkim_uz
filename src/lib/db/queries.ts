import { getDb } from "@/lib/cloudflare";
import { generateInviteCode } from "@/lib/utils";
import type {
  Comment,
  Event,
  EventMember,
  EventPayment,
  EventPaymentMode,
  EventPaymentStatus,
  Expense,
  User,
} from "@/types";
import { nestComments } from "@/lib/expense/settlement";

function normalizeEvent<T extends Partial<Event>>(row: T | null): (T & { payment_mode: EventPaymentMode }) | null {
  if (!row) return null;
  return {
    ...row,
    payment_mode: (row.payment_mode as EventPaymentMode | undefined) ?? "free",
    ticket_currency: row.ticket_currency ?? "UZS",
  };
}

export async function listUserEvents(userId: string): Promise<Event[]> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT e.*
       FROM events e
       JOIN event_members em ON em.event_id = e.id
       WHERE em.user_id = ?
       ORDER BY e.starts_at ASC`,
    )
    .bind(userId)
    .all<Event>();

  return (result.results ?? []).map((row) => normalizeEvent(row)!);
}

export async function getEventByInviteCode(code: string): Promise<Event | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT * FROM events WHERE invite_code = ?")
    .bind(code)
    .first<Event>();
  return normalizeEvent(row);
}

export async function joinEvent(eventId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const existing = await isEventMember(eventId, userId);
  if (existing) return true;

  await db
    .prepare(
      "INSERT INTO event_members (event_id, user_id, role) VALUES (?, ?, 'member')",
    )
    .bind(eventId, userId)
    .run();

  return true;
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = await getDb();
  return (
    (await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<User>()) ?? null
  );
}

export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  const db = await getDb();
  return (
    (await db
      .prepare("SELECT * FROM users WHERE telegram_id = ?")
      .bind(telegramId)
      .first<User>()) ?? null
  );
}

export async function isEventOwnerByTelegramId(
  eventId: string,
  telegramId: string,
): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT 1
       FROM event_members em
       JOIN users u ON u.id = em.user_id
       WHERE em.event_id = ? AND u.telegram_id = ? AND em.role = 'owner'`,
    )
    .bind(eventId, telegramId)
    .first();
  return Boolean(row);
}

export async function setEventTelegramGroup(eventId: string, chatId: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE events SET telegram_chat_id = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(chatId, eventId)
    .run();
}

export async function clearEventTelegramGroup(eventId: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE events SET telegram_chat_id = NULL, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(eventId)
    .run();
}

export async function getEventByTelegramGroupId(chatId: string): Promise<Event | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT * FROM events WHERE telegram_chat_id = ?")
    .bind(chatId)
    .first<Event>();
  return normalizeEvent(row);
}

export async function upsertEventPayment({
  id,
  eventId,
  userId,
  stripeCheckoutSessionId,
  stripePaymentIntentId,
  amountCents,
  currency,
  status,
}: {
  id: string;
  eventId: string;
  userId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  amountCents: number;
  currency: string;
  status: EventPaymentStatus;
}) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO event_payments (
        id, event_id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
        amount_cents, currency, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(stripe_checkout_session_id) DO UPDATE SET
        stripe_payment_intent_id = excluded.stripe_payment_intent_id,
        amount_cents = excluded.amount_cents,
        currency = excluded.currency,
        status = excluded.status,
        updated_at = datetime('now')`,
    )
    .bind(
      id,
      eventId,
      userId,
      stripeCheckoutSessionId,
      stripePaymentIntentId,
      amountCents,
      currency,
      status,
    )
    .run();
}

export async function createPendingEventPayment({
  id,
  eventId,
  userId,
  stripeCheckoutSessionId,
  amountCents,
  currency,
}: {
  id: string;
  eventId: string;
  userId: string;
  stripeCheckoutSessionId: string;
  amountCents: number;
  currency: string;
}) {
  await upsertEventPayment({
    id,
    eventId,
    userId,
    stripeCheckoutSessionId,
    stripePaymentIntentId: null,
    amountCents,
    currency,
    status: "pending",
  });
}

export async function hasCompletedEventPayment(eventId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT 1 FROM event_payments
       WHERE event_id = ? AND user_id = ? AND status = 'completed'
       LIMIT 1`,
    )
    .bind(eventId, userId)
    .first();
  return Boolean(row);
}

export async function getEventPaymentBySessionId(
  sessionId: string,
): Promise<EventPayment | null> {
  const db = await getDb();
  return (
    (await db
      .prepare("SELECT * FROM event_payments WHERE stripe_checkout_session_id = ?")
      .bind(sessionId)
      .first<EventPayment>()) ?? null
  );
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT * FROM events WHERE id = ?")
    .bind(eventId)
    .first<Event>();
  return normalizeEvent(row);
}

export async function isEventMember(eventId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT 1 FROM event_members WHERE event_id = ? AND user_id = ?")
    .bind(eventId, userId)
    .first();
  return Boolean(row);
}

export async function isEventOwner(eventId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare(
      "SELECT 1 FROM event_members WHERE event_id = ? AND user_id = ? AND role = 'owner'",
    )
    .bind(eventId, userId)
    .first();
  return Boolean(row);
}

export async function getEventMemberRole(
  eventId: string,
  userId: string,
): Promise<"owner" | "member" | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT role FROM event_members WHERE event_id = ? AND user_id = ?")
    .bind(eventId, userId)
    .first<{ role: "owner" | "member" }>();

  return row?.role ?? null;
}

export async function leaveEvent(eventId: string, userId: string): Promise<boolean> {
  const role = await getEventMemberRole(eventId, userId);
  if (!role || role === "owner") return false;

  await removeEventMember(eventId, userId);
  return true;
}

export async function removeEventMember(eventId: string, userId: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare("DELETE FROM event_members WHERE event_id = ? AND user_id = ?")
    .bind(eventId, userId)
    .run();
}

export async function transferEventOwnership(
  eventId: string,
  fromUserId: string,
  toUserId: string,
): Promise<boolean> {
  const db = await getDb();
  const fromRole = await getEventMemberRole(eventId, fromUserId);
  const toRole = await getEventMemberRole(eventId, toUserId);

  if (fromRole !== "owner" || !toRole || toUserId === fromUserId) {
    return false;
  }

  await db
    .prepare(
      "UPDATE event_members SET role = 'member' WHERE event_id = ? AND user_id = ?",
    )
    .bind(eventId, fromUserId)
    .run();

  await db
    .prepare(
      "UPDATE event_members SET role = 'owner' WHERE event_id = ? AND user_id = ?",
    )
    .bind(eventId, toUserId)
    .run();

  await db
    .prepare("UPDATE events SET creator_id = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(toUserId, eventId)
    .run();

  return true;
}

export async function regenerateEventInviteCode(eventId: string): Promise<string | null> {
  const db = await getDb();
  const code = generateInviteCode();

  await db
    .prepare("UPDATE events SET invite_code = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(code, eventId)
    .run();

  return code;
}

export async function listEventMembers(eventId: string): Promise<EventMember[]> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT u.*, em.role
       FROM users u
       JOIN event_members em ON em.user_id = u.id
       WHERE em.event_id = ?
       ORDER BY CASE em.role WHEN 'owner' THEN 0 ELSE 1 END, u.first_name ASC`,
    )
    .bind(eventId)
    .all<EventMember>();

  return result.results ?? [];
}

export async function listEventComments(eventId: string) {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT c.*, u.first_name, u.last_name, u.username, u.photo_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.event_id = ?
       ORDER BY c.created_at ASC`,
    )
    .bind(eventId)
    .all<
      Comment & {
        first_name: string;
        last_name: string | null;
        username: string | null;
        photo_url: string | null;
      }
    >();

  const flat = (result.results ?? []).map((row) => ({
    id: row.id,
    event_id: row.event_id,
    parent_id: row.parent_id,
    user_id: row.user_id,
    body: row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user: {
      id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      username: row.username,
      photo_url: row.photo_url,
    },
  }));

  return nestComments(flat);
}

export async function listEventExpenses(eventId: string): Promise<Expense[]> {
  const db = await getDb();
  const expenses = await db
    .prepare(
      `SELECT e.*, u.first_name, u.last_name, u.username
       FROM expenses e
       JOIN users u ON u.id = e.payer_id
       WHERE e.event_id = ?
       ORDER BY e.created_at DESC`,
    )
    .bind(eventId)
    .all<
      Expense & {
        first_name: string;
        last_name: string | null;
        username: string | null;
      }
    >();

  const items = expenses.results ?? [];
  const withSplits: Expense[] = [];

  for (const expense of items) {
    const splits = await db
      .prepare(
        `SELECT es.*, u.first_name, u.last_name, u.username
         FROM expense_splits es
         JOIN users u ON u.id = es.user_id
         WHERE es.expense_id = ?`,
      )
      .bind(expense.id)
      .all<{
        expense_id: string;
        user_id: string;
        amount_cents: number;
        first_name: string;
        last_name: string | null;
        username: string | null;
      }>();

    withSplits.push({
      id: expense.id,
      event_id: expense.event_id,
      payer_id: expense.payer_id,
      amount_cents: expense.amount_cents,
      currency: expense.currency,
      description: expense.description,
      created_at: expense.created_at,
      payer: {
        id: expense.payer_id,
        first_name: expense.first_name,
        last_name: expense.last_name,
        username: expense.username,
      },
      splits: (splits.results ?? []).map((split) => ({
        expense_id: split.expense_id,
        user_id: split.user_id,
        amount_cents: split.amount_cents,
        user: {
          id: split.user_id,
          first_name: split.first_name,
          last_name: split.last_name,
          username: split.username,
        },
      })),
    });
  }

  return withSplits;
}
