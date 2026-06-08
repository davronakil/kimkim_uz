import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, runInBackground } from "@/lib/cloudflare";
import { isEventMember, listEventMembers } from "@/lib/db/queries";
import { notifyNewExpense } from "@/lib/telegram/notifications";
import { buildExpenseSplits } from "@/lib/expense/mutations";
import { formatMoney } from "@/lib/utils";

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
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await context.params;
  const member = await isEventMember(eventId, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = expenseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense" }, { status: 400 });
  }

  const members = await listEventMembers(eventId);
  const memberIds = new Set(members.map((m) => m.id));
  if (!memberIds.has(parsed.data.payer_id)) {
    return NextResponse.json({ error: "Invalid payer" }, { status: 400 });
  }

  const built = buildExpenseSplits(parsed.data, memberIds);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  const { amountCents, splits: splitEntries } = built;

  const db = await getDb();
  const expenseId = nanoid();

  await db
    .prepare(
      "INSERT INTO expenses (id, event_id, payer_id, amount_cents, currency, description) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      expenseId,
      eventId,
      parsed.data.payer_id,
      amountCents,
      parsed.data.currency,
      parsed.data.description,
    )
    .run();

  for (const split of splitEntries) {
    await db
      .prepare(
        "INSERT INTO expense_splits (expense_id, user_id, amount_cents) VALUES (?, ?, ?)",
      )
      .bind(expenseId, split.user_id, split.amount_cents)
      .run();
  }

  void runInBackground(
    notifyNewExpense({
      eventId,
      author: user,
      description: parsed.data.description,
      amountLabel: formatMoney(amountCents, parsed.data.currency, user.language_code),
      authorUserId: user.id,
    }),
  );

  return NextResponse.json({ id: expenseId });
}
