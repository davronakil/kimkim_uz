import {
  allocateWeightedCents,
  isEvenPerPersonSplit,
} from "@/lib/expense/mutations";
import type { Expense, ExpenseSplit } from "@/types";

export type ShareWeightMember = {
  id: string;
  additional_guest_count?: number | null;
};

function amountsMatch(
  splits: ExpenseSplit[],
  allocated: Array<{ user_id: string; amount_cents: number }>,
) {
  if (splits.length !== allocated.length) return false;
  const byUser = new Map(allocated.map((split) => [split.user_id, split.amount_cents]));
  return splits.every((split) => byUser.get(split.user_id) === split.amount_cents);
}

/**
 * Equal splits follow current guest shares (+N). Custom amounts stay as saved.
 * Legacy rows with no split mode are treated as equal when they already match
 * an even per-person split or the current share weights.
 */
export function presentExpenseShares<T extends Expense>(
  expense: T,
  weights: Record<string, number>,
): T {
  const participants = expense.splits ?? [];
  if (participants.length === 0 || expense.split_mode === "custom") return expense;

  const allocated = allocateWeightedCents(
    expense.amount_cents,
    participants.map((split) => ({
      user_id: split.user_id,
      weight: Math.max(1, Math.floor(weights[split.user_id] ?? 1)),
    })),
  );
  const matchesWeights = amountsMatch(participants, allocated);
  const evenPerPerson = isEvenPerPersonSplit(
    expense.amount_cents,
    participants.map((split) => split.amount_cents),
  );
  const treatAsEqual = expense.split_mode === "equal" || matchesWeights || evenPerPerson;

  if (!treatAsEqual) {
    return { ...expense, split_mode: "custom" };
  }

  const byUser = new Map(allocated.map((split) => [split.user_id, split.amount_cents]));
  return {
    ...expense,
    split_mode: "equal",
    splits: participants.map((split) => ({
      ...split,
      amount_cents: byUser.get(split.user_id) ?? split.amount_cents,
    })),
  };
}

export function presentEventExpenses<T extends Expense>(
  expenses: T[],
  members: ShareWeightMember[],
): T[] {
  const weights = Object.fromEntries(
    members.map((member) => [member.id, 1 + Math.max(0, member.additional_guest_count ?? 0)]),
  );
  return expenses.map((expense) => presentExpenseShares(expense, weights));
}
