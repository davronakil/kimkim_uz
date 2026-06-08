import { getDb } from "@/lib/cloudflare";
import type { Comment, Event, Expense, User } from "@/types";
import { nestComments } from "@/lib/expense/settlement";

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

  return result.results ?? [];
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const db = await getDb();
  return (
    (await db
      .prepare("SELECT * FROM events WHERE id = ?")
      .bind(eventId)
      .first<Event>()) ?? null
  );
}

export async function isEventMember(eventId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT 1 FROM event_members WHERE event_id = ? AND user_id = ?")
    .bind(eventId, userId)
    .first();
  return Boolean(row);
}

export async function listEventMembers(eventId: string): Promise<User[]> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT u.*
       FROM users u
       JOIN event_members em ON em.user_id = u.id
       WHERE em.event_id = ?
       ORDER BY u.first_name ASC`,
    )
    .bind(eventId)
    .all<User>();

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
