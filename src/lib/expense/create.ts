import { nanoid } from "nanoid";
import { getDb } from "@/lib/cloudflare";
import { buildExpenseSplits } from "@/lib/expense/mutations";

export async function createExpenseRecord({
  eventId,
  payerId,
  description,
  amount,
  currency = "UZS",
  splitUserIds,
  splitWeights,
}: {
  eventId: string;
  payerId: string;
  description: string;
  amount: number;
  currency?: string;
  splitUserIds: string[];
  splitWeights?: Record<string, number>;
}) {
  const memberIds = new Set(splitUserIds);
  const built = buildExpenseSplits(
    {
      description,
      amount,
      currency,
      payer_id: payerId,
      split_mode: "equal",
      split_user_ids: splitUserIds,
      split_weights: splitWeights,
    },
    memberIds,
  );

  if (!built.ok) {
    throw new Error(built.error);
  }

  const db = await getDb();
  const expenseId = nanoid();

  await db
    .prepare(
      "INSERT INTO expenses (id, event_id, payer_id, amount_cents, currency, description) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(expenseId, eventId, payerId, built.amountCents, currency, description)
    .run();

  for (const split of built.splits) {
    await db
      .prepare(
        "INSERT INTO expense_splits (expense_id, user_id, amount_cents) VALUES (?, ?, ?)",
      )
      .bind(expenseId, split.user_id, split.amount_cents)
      .run();
  }

  return { expenseId, amountCents: built.amountCents, currency };
}
