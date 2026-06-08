import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/cloudflare";
import { isEventMember, listEventMembers } from "@/lib/db/queries";
import { buildExpenseSplits } from "@/lib/expense/mutations";

const expenseSchema = z
  .object({
    description: z.string().min(1).max(500),
    amount: z.number().positive(),
    currency: z.string().default("UZS"),
    payer_id: z.string(),
    split_mode: z.enum(["equal", "custom"]).default("equal"),
    split_user_ids: z.array(z.string()).optional(),
    custom_splits: z
      .array(
        z.object({
          user_id: z.string(),
          amount: z.number().nonnegative(),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.split_mode === "equal" && (!data.split_user_ids || data.split_user_ids.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "split_user_ids required for equal split",
      });
    }
    if (data.split_mode === "custom" && (!data.custom_splits || data.custom_splits.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "custom_splits required for custom split",
      });
    }
  });

type RouteContext = {
  params: Promise<{ id: string; expenseId: string }>;
};

async function getExpenseForEvent(eventId: string, expenseId: string) {
  const db = await getDb();
  return db
    .prepare("SELECT id FROM expenses WHERE id = ? AND event_id = ?")
    .bind(expenseId, eventId)
    .first<{ id: string }>();
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, expenseId } = await context.params;
  const member = await isEventMember(eventId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await getExpenseForEvent(eventId, expenseId);
  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = expenseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense" }, { status: 400 });
  }

  const members = await listEventMembers(eventId);
  const memberIds = new Set(members.map((m) => m.id));
  const built = buildExpenseSplits(parsed.data, memberIds);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  const db = await getDb();
  await db
    .prepare(
      "UPDATE expenses SET payer_id = ?, amount_cents = ?, currency = ?, description = ? WHERE id = ?",
    )
    .bind(
      parsed.data.payer_id,
      built.amountCents,
      parsed.data.currency,
      parsed.data.description,
      expenseId,
    )
    .run();

  await db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").bind(expenseId).run();

  for (const split of built.splits) {
    await db
      .prepare(
        "INSERT INTO expense_splits (expense_id, user_id, amount_cents) VALUES (?, ?, ?)",
      )
      .bind(expenseId, split.user_id, split.amount_cents)
      .run();
  }

  return NextResponse.json({ id: expenseId });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, expenseId } = await context.params;
  const member = await isEventMember(eventId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await getExpenseForEvent(eventId, expenseId);
  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = await getDb();
  await db.prepare("DELETE FROM expenses WHERE id = ?").bind(expenseId).run();

  return NextResponse.json({ ok: true });
}
