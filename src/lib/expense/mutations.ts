import { majorToCents } from "@/lib/utils";

export type ExpenseInput = {
  description: string;
  amount: number;
  currency?: string;
  payer_id: string;
  split_mode: "equal" | "custom";
  split_user_ids?: string[];
  split_weights?: Record<string, number>;
  custom_splits?: Array<{ user_id: string; amount: number }>;
};

export function buildExpenseSplits(
  input: ExpenseInput,
  memberIds: Set<string>,
): { ok: true; splits: Array<{ user_id: string; amount_cents: number }>; amountCents: number } | { ok: false; error: string } {
  const amountCents = majorToCents(input.amount);

  if (!memberIds.has(input.payer_id)) {
    return { ok: false, error: "Invalid payer" };
  }

  let splitEntries: Array<{ user_id: string; amount_cents: number }> = [];

  if (input.split_mode === "equal") {
    const splitUserIds = input.split_user_ids ?? [];
    for (const splitUserId of splitUserIds) {
      if (!memberIds.has(splitUserId)) {
        return { ok: false, error: "Invalid split member" };
      }
    }

    const weightedSplits = splitUserIds.map((userId) => {
      const weight = Math.max(1, Math.floor(input.split_weights?.[userId] ?? 1));
      return { user_id: userId, weight };
    });
    const totalWeight = weightedSplits.reduce((sum, split) => sum + split.weight, 0);

    if (totalWeight === 0) {
      return { ok: false, error: "Invalid split member" };
    }

    let assigned = 0;
    splitEntries = weightedSplits.map((split) => {
      const cents = Math.floor((amountCents * split.weight) / totalWeight);
      assigned += cents;
      return { user_id: split.user_id, amount_cents: cents };
    });

    let remainder = amountCents - assigned;
    for (const split of splitEntries) {
      if (remainder <= 0) break;
      split.amount_cents += 1;
      remainder -= 1;
    }
  } else {
    const customSplits = input.custom_splits ?? [];
    let total = 0;

    for (const split of customSplits) {
      if (!memberIds.has(split.user_id)) {
        return { ok: false, error: "Invalid split member" };
      }
      const cents = majorToCents(split.amount);
      total += cents;
      splitEntries.push({ user_id: split.user_id, amount_cents: cents });
    }

    if (total !== amountCents) {
      return { ok: false, error: "Custom splits must sum to total amount" };
    }
  }

  return { ok: true, splits: splitEntries, amountCents };
}
