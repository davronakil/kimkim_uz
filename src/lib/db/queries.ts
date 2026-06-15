import { getDb } from "@/lib/cloudflare";
import { generateInviteCode } from "@/lib/utils";
import { nanoid } from "nanoid";
import type {
  Comment,
  Event,
  EventMember,
  EventNotificationMode,
  EventPayment,
  EventPaymentMode,
  EventPaymentSource,
  EventPaymentSummary,
  EventPaymentStatus,
  EventReferralSource,
  EventWithCreator,
  Expense,
  User,
} from "@/types";
import { nestComments } from "@/lib/expense/settlement";

function normalizeEvent<T extends Partial<Event>>(
  row: T | null,
): (T & {
  expense_currency: string;
  payment_mode: EventPaymentMode;
  visibility: Event["visibility"];
}) | null {
  if (!row) return null;
  return {
    ...row,
    payment_mode: (row.payment_mode as EventPaymentMode | undefined) ?? "free",
    expense_currency: row.expense_currency ?? "UZS",
    ticket_currency: row.ticket_currency ?? "UZS",
    visibility: row.visibility === "public" ? "public" : "private",
  };
}

export async function listPublicEventsForSitemap(): Promise<
  Array<Pick<Event, "id" | "updated_at" | "starts_at">>
> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT id, updated_at, starts_at
       FROM events
       WHERE visibility = 'public'
         AND starts_at >= datetime('now', '-90 days')
       ORDER BY starts_at ASC`,
    )
    .all<Pick<Event, "id" | "updated_at" | "starts_at">>();

  return result.results ?? [];
}

export async function listPublicEvents(): Promise<EventWithCreator[]> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT e.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name,
              u.username AS creator_username
       FROM events e
       JOIN users u ON u.id = e.creator_id
       WHERE e.visibility = 'public'
         AND e.starts_at >= datetime('now', '-90 days')
       ORDER BY e.starts_at ASC`,
    )
    .all<EventWithCreator>();

  return (result.results ?? []).map((row) => normalizeEvent(row)!);
}

export async function listUserEvents(userId: string): Promise<EventWithCreator[]> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT e.*, u.first_name AS creator_first_name, u.last_name AS creator_last_name,
              u.username AS creator_username
       FROM events e
       JOIN users u ON u.id = e.creator_id
       JOIN event_members em ON em.event_id = e.id
       WHERE em.user_id = ?
       ORDER BY e.starts_at ASC`,
    )
    .bind(userId)
    .all<EventWithCreator>();

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

export async function recordEventReferral({
  eventId,
  inviteCode,
  referredUserId,
  referrerUserId,
  source,
}: {
  eventId: string;
  inviteCode: string;
  referredUserId: string;
  referrerUserId?: string | null;
  source: EventReferralSource;
}) {
  if (
    !inviteCode ||
    !referrerUserId ||
    referrerUserId === referredUserId ||
    !/^[A-Za-z0-9_-]{4,64}$/.test(referrerUserId)
  ) {
    return;
  }

  const db = await getDb();
  await db
    .prepare(
      `INSERT OR IGNORE INTO event_referrals (
        id, event_id, invite_code, referred_user_id, referrer_user_id, source
      )
       SELECT ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM users WHERE id = ?)`,
    )
    .bind(
      nanoid(),
      eventId,
      inviteCode,
      referredUserId,
      referrerUserId,
      source,
      referrerUserId,
    )
    .run();
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = await getDb();
  return (
    (await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<User>()) ?? null
  );
}

export async function updateUserPayoutPreferences({
  userId,
  payoutMethod,
  payoutDetails,
}: {
  userId: string;
  payoutMethod: string | null;
  payoutDetails: string | null;
}): Promise<User | null> {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE users
       SET payout_method = ?, payout_details = ?, payout_updated_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(payoutMethod, payoutDetails, userId)
    .run();

  return getUserById(userId);
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
  source = "stripe",
  markedByUserId = null,
  note = null,
}: {
  id: string;
  eventId: string;
  userId: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  amountCents: number;
  currency: string;
  status: EventPaymentStatus;
  source?: EventPaymentSource;
  markedByUserId?: string | null;
  note?: string | null;
}) {
  const db = await getDb();
  const existing = stripeCheckoutSessionId
    ? await db
        .prepare(
          `SELECT id FROM event_payments WHERE stripe_checkout_session_id = ? LIMIT 1`,
        )
        .bind(stripeCheckoutSessionId)
        .first<{ id: string }>()
    : null;

  if (existing) {
    await db
      .prepare(
        `UPDATE event_payments
         SET stripe_payment_intent_id = ?, amount_cents = ?, currency = ?,
             status = ?, source = ?, marked_by_user_id = ?, note = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(
        stripePaymentIntentId,
        amountCents,
        currency,
        status,
        source,
        markedByUserId,
        note,
        existing.id,
      )
      .run();
    return;
  }

  await db
    .prepare(
      `INSERT INTO event_payments (
        id, event_id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
        amount_cents, currency, status, source, marked_by_user_id, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
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
      source,
      markedByUserId,
      note,
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

export async function setManualEventPayment({
  eventId,
  userId,
  markedByUserId,
  amountCents,
  currency,
  status,
  note,
}: {
  eventId: string;
  userId: string;
  markedByUserId: string;
  amountCents: number;
  currency: string;
  status: EventPaymentStatus;
  note?: string | null;
}) {
  const db = await getDb();
  const existing = await db
    .prepare(
      `SELECT id FROM event_payments
       WHERE event_id = ? AND user_id = ? AND source = 'manual'
       LIMIT 1`,
    )
    .bind(eventId, userId)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE event_payments
         SET amount_cents = ?, currency = ?, status = ?, marked_by_user_id = ?,
             note = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(amountCents, currency, status, markedByUserId, note ?? null, existing.id)
      .run();
    return;
  }

  await upsertEventPayment({
    id: crypto.randomUUID(),
    eventId,
    userId,
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    amountCents,
    currency,
    status,
    source: "manual",
    markedByUserId,
    note: note ?? null,
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

export async function listEventPaymentSummaries(
  eventId: string,
): Promise<EventPaymentSummary[]> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT user_id, amount_cents, currency, status, source, note, updated_at
       FROM event_payments
       WHERE event_id = ?
       ORDER BY updated_at DESC`,
    )
    .bind(eventId)
    .all<EventPaymentSummary>();

  const summaries = new Map<string, EventPaymentSummary>();
  for (const payment of result.results ?? []) {
    const current = summaries.get(payment.user_id);
    if (!current) {
      summaries.set(payment.user_id, payment);
      continue;
    }

    if (payment.status === "completed" && current.status !== "completed") {
      summaries.set(payment.user_id, payment);
    }
  }

  return [...summaries.values()];
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
  await db
    .prepare("DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?")
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

export async function getEventNotificationMode(
  eventId: string,
  userId: string,
): Promise<EventNotificationMode> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT mode FROM event_notification_preferences
       WHERE event_id = ? AND user_id = ?`,
    )
    .bind(eventId, userId)
    .first<{ mode: EventNotificationMode }>();

  return row?.mode ?? "instant";
}

export async function setEventNotificationMode({
  eventId,
  userId,
  mode,
}: {
  eventId: string;
  userId: string;
  mode: EventNotificationMode;
}) {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO event_notification_preferences (event_id, user_id, mode, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(event_id, user_id) DO UPDATE SET
         mode = excluded.mode,
         updated_at = datetime('now')`,
    )
    .bind(eventId, userId, mode)
    .run();
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
      `SELECT
         u.*,
         em.role,
         em.joined_at,
         COALESCE(r.status, 'going') AS rsvp_status,
         COALESCE(r.additional_guest_count, 0) AS additional_guest_count,
         r.updated_at AS rsvp_updated_at,
         er.source AS referral_source,
         er.referrer_user_id,
         ref.username AS referrer_username,
         ref.first_name AS referrer_first_name,
         ref.last_name AS referrer_last_name
       FROM users u
       JOIN event_members em ON em.user_id = u.id
       LEFT JOIN event_rsvps r ON r.event_id = em.event_id AND r.user_id = u.id
       LEFT JOIN event_referrals er ON er.event_id = em.event_id AND er.referred_user_id = u.id
       LEFT JOIN users ref ON ref.id = er.referrer_user_id
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
