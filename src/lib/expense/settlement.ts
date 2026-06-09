import type { Settlement } from "@/types";

type BalanceEntry = {
  userId: string;
  balanceCents: number;
};

/**
 * Greedy debt simplification: minimizes number of transfers.
 * Positive balance = owed money; negative = owes money.
 */
export function calculateSettlements(
  balances: BalanceEntry[],
  currency = "UZS",
): Settlement[] {
  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balanceCents - a.balanceCents);

  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ userId: b.userId, balanceCents: Math.abs(b.balanceCents) }))
    .sort((a, b) => b.balanceCents - a.balanceCents);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.balanceCents, debtor.balanceCents);

    if (amount > 0) {
      settlements.push({
        from_user_id: debtor.userId,
        to_user_id: creditor.userId,
        amount_cents: amount,
        currency,
      });
    }

    creditor.balanceCents -= amount;
    debtor.balanceCents -= amount;

    if (creditor.balanceCents === 0) i += 1;
    if (debtor.balanceCents === 0) j += 1;
  }

  return settlements;
}

export function buildBalancesFromExpenses(
  expenses: Array<{
    payer_id: string;
    amount_cents: number;
    splits: Array<{ user_id: string; amount_cents: number }>;
  }>,
): Map<string, number> {
  const balances = new Map<string, number>();

  const adjust = (userId: string, delta: number) => {
    balances.set(userId, (balances.get(userId) ?? 0) + delta);
  };

  for (const expense of expenses) {
    adjust(expense.payer_id, expense.amount_cents);
    for (const split of expense.splits) {
      adjust(split.user_id, -split.amount_cents);
    }
  }

  return balances;
}

export function calculateSettlementsFromExpenses(
  expenses: Array<{
    payer_id: string;
    amount_cents: number;
    currency: string;
    splits: Array<{ user_id: string; amount_cents: number }>;
  }>,
): Settlement[] {
  const byCurrency = new Map<string, typeof expenses>();

  for (const expense of expenses) {
    const currency = expense.currency || "UZS";
    const currencyExpenses = byCurrency.get(currency) ?? [];
    currencyExpenses.push(expense);
    byCurrency.set(currency, currencyExpenses);
  }

  return [...byCurrency.entries()].flatMap(([currency, currencyExpenses]) => {
    const balances = buildBalancesFromExpenses(currencyExpenses);
    return calculateSettlements(
      [...balances.entries()].map(([userId, balanceCents]) => ({
        userId,
        balanceCents,
      })),
      currency,
    );
  });
}

export function nestComments<T extends { id: string; parent_id: string | null; created_at: string }>(
  comments: T[],
): Array<T & { replies: Array<T & { replies: [] }> }> {
  const byId = new Map<string, T & { replies: Array<T & { replies: [] }> }>();
  const roots: Array<T & { replies: Array<T & { replies: [] }> }> = [];

  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const node = byId.get(comment.id)!;
    if (comment.parent_id && byId.has(comment.parent_id)) {
      byId.get(comment.parent_id)!.replies.push(node as T & { replies: [] });
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (
    nodes: Array<T & { replies: Array<T & { replies: [] }> }>,
  ) => {
    nodes.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    for (const node of nodes) sortRecursive(node.replies);
  };

  sortRecursive(roots);
  return roots;
}
