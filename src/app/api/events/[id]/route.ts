import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getEventById,
  isEventMember,
  listEventComments,
  listEventExpenses,
  listEventMembers,
} from "@/lib/db/queries";
import {
  buildBalancesFromExpenses,
  calculateSettlements,
} from "@/lib/expense/settlement";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await isEventMember(id, user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [members, comments, expenses] = await Promise.all([
    listEventMembers(id),
    listEventComments(id),
    listEventExpenses(id),
  ]);

  const balances = buildBalancesFromExpenses(
    expenses.map((expense) => ({
      payer_id: expense.payer_id,
      amount_cents: expense.amount_cents,
      splits: (expense.splits ?? []).map((split) => ({
        user_id: split.user_id,
        amount_cents: split.amount_cents,
      })),
    })),
  );

  const settlements = calculateSettlements(
    [...balances.entries()].map(([userId, balanceCents]) => ({
      userId,
      balanceCents,
    })),
    expenses[0]?.currency ?? "UZS",
  );

  return NextResponse.json({ event, members, comments, expenses, settlements });
}
