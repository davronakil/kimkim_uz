import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { EventWorkspace } from "@/components/events/event-workspace";
import { PublicEventOverview } from "@/components/events/public-event-overview";
import { getCurrentUser } from "@/lib/auth/session";
import { buildEventShareMetadata } from "@/lib/event-metadata";
import {
  buildBalancesFromExpenses,
  calculateSettlements,
} from "@/lib/expense/settlement";
import {
  getEventById,
  getEventMemberRole,
  isEventMember,
  isEventOwner,
  listEventComments,
  listEventExpenses,
  listEventMembers,
  listEventPaymentSummaries,
} from "@/lib/db/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const event = await getEventById(id);

  if (!event) {
    return { title: "Event not found" };
  }

  return buildEventShareMetadata(event, locale, `/${locale}/events/${id}`);
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const event = await getEventById(id);
  if (!event) notFound();

  const user = await getCurrentUser();
  const member = user ? await isEventMember(id, user.id) : false;

  if (!user || !member) {
    const members = await listEventMembers(id);
    return (
      <PublicEventOverview
        event={event}
        locale={locale}
        memberCount={members.length}
        loggedIn={Boolean(user)}
      />
    );
  }

  const [members, comments, expenses, paymentSummaries] = await Promise.all([
    listEventMembers(id),
    listEventComments(id),
    listEventExpenses(id),
    listEventPaymentSummaries(id),
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

  const [canEdit, role, botUsername] = await Promise.all([
    isEventOwner(id, user.id),
    getEventMemberRole(id, user.id),
    Promise.resolve(
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
        process.env.TELEGRAM_BOT_USERNAME ??
        "kimkimuzbot",
    ),
  ]);

  return (
    <EventWorkspace
      eventId={id}
      locale={locale}
      botUsername={botUsername}
      canEdit={canEdit}
      canLeave={role === "member"}
      showNotifyBanner={!user.telegram_chat_id}
      currentUserId={user.id}
      initialData={{ event, members, comments, expenses, settlements, paymentSummaries }}
    />
  );
}
