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

/** Either party can undo a payment; the owner can also undo any line of their settle-up. */
export function canUndoSettlementPayment(
  payment: { from_user_id: string; to_user_id: string; settle_up_id: string | null },
  actorId: string,
  actorIsOwner: boolean,
) {
  if (payment.from_user_id === actorId || payment.to_user_id === actorId) return true;
  return Boolean(payment.settle_up_id) && actorIsOwner;
}

type LedgerTransfer = { from_user_id: string; to_user_id: string; amount_cents: number };

/** Expenses credit the payer; recorded transfers credit the sender and debit the recipient. */
export function buildBalancesFromExpenses(
  expenses: Array<{
    payer_id: string;
    amount_cents: number;
    splits: Array<{ user_id: string; amount_cents: number }>;
  }>,
  transfers: LedgerTransfer[] = [],
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

  for (const transfer of transfers) {
    adjust(transfer.from_user_id, transfer.amount_cents);
    adjust(transfer.to_user_id, -transfer.amount_cents);
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
  transfers: Array<LedgerTransfer & { currency: string }> = [],
): Settlement[] {
  const byCurrency = new Map<string, { expenses: typeof expenses; transfers: typeof transfers }>();
  const bucket = (currency: string) => {
    const existing = byCurrency.get(currency);
    if (existing) return existing;
    const created = { expenses: [] as typeof expenses, transfers: [] as typeof transfers };
    byCurrency.set(currency, created);
    return created;
  };

  for (const expense of expenses) {
    bucket(expense.currency || "UZS").expenses.push(expense);
  }
  for (const transfer of transfers) {
    bucket(transfer.currency || "UZS").transfers.push(transfer);
  }

  return [...byCurrency.entries()].flatMap(([currency, ledger]) => {
    const balances = buildBalancesFromExpenses(ledger.expenses, ledger.transfers);
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
