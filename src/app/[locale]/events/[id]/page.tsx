import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { EventWorkspace } from "@/components/events/event-workspace";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  buildBalancesFromExpenses,
  calculateSettlements,
} from "@/lib/expense/settlement";
import {
  getEventById,
  isEventMember,
  listEventComments,
  listEventExpenses,
  listEventMembers,
} from "@/lib/db/queries";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  const event = await getEventById(id);
  if (!event) notFound();

  const member = await isEventMember(id, user.id);
  if (!member) notFound();

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

  return (
    <EventWorkspace
      eventId={id}
      locale={locale}
      initialData={{ event, members, comments, expenses, settlements }}
    />
  );
}
