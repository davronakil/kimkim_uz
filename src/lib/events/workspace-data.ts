import {
  listEventComments,
  listEventExpenses,
  listEventMembers,
  listEventPaymentSummaries,
  listPaymentMethodsForUsers,
  listSettlementPayments,
} from "@/lib/db/queries";
import { presentEventExpenses } from "@/lib/expense/shares";
import { calculateSettlementsFromExpenses } from "@/lib/expense/settlement";
import {
  PAYMENT_METHODS_CURRENCY,
  ticketPaidWithHandles,
  type PaymentMethod,
} from "@/lib/payments/methods";
import type {
  Event,
  EventMember,
  Expense,
  PublicEventMember,
  Settlement,
  SettlementPayment,
} from "@/types";

export function toPublicEventMember(member: EventMember): PublicEventMember {
  return {
    id: member.id,
    username: member.username,
    first_name: member.first_name,
    last_name: member.last_name,
    photo_url: member.photo_url,
    role: member.role,
    joined_at: member.joined_at,
    rsvp_status: member.rsvp_status,
    additional_guest_count: member.additional_guest_count,
    rsvp_updated_at: member.rsvp_updated_at,
    referral_source: member.referral_source,
    referrer_user_id: member.referrer_user_id,
    referrer_username: member.referrer_username,
    referrer_first_name: member.referrer_first_name,
    referrer_last_name: member.referrer_last_name,
  };
}

export function settlementsForExpenses(
  expenses: Expense[],
  payments: SettlementPayment[] = [],
): Settlement[] {
  return calculateSettlementsFromExpenses(
    expenses.map((expense) => ({
      payer_id: expense.payer_id,
      amount_cents: expense.amount_cents,
      currency: expense.currency,
      splits: (expense.splits ?? []).map((split) => ({
        user_id: split.user_id,
        amount_cents: split.amount_cents,
      })),
    })),
    payments,
  );
}

/**
 * Payment handles of whoever is owed money in a USD settlement, plus the host's
 * on a paid USD event; nobody else's leave the server.
 */
export async function payeePaymentMethods(
  settlements: Settlement[],
  hostId?: string | null,
): Promise<Record<string, PaymentMethod[]>> {
  const payees = settlements
    .filter((settlement) => settlement.currency === PAYMENT_METHODS_CURRENCY)
    .map((settlement) => settlement.to_user_id);
  return listPaymentMethodsForUsers(hostId ? [...payees, hostId] : payees);
}

export async function loadEventSettlements(eventId: string, members?: EventMember[]) {
  const [expenses, eventMembers, payments] = await Promise.all([
    listEventExpenses(eventId),
    members ? Promise.resolve(members) : listEventMembers(eventId),
    listSettlementPayments(eventId),
  ]);
  const sharedExpenses = presentEventExpenses(expenses, eventMembers);
  return {
    members: eventMembers,
    expenses: sharedExpenses,
    settlementPayments: payments,
    settlements: settlementsForExpenses(sharedExpenses, payments),
  };
}

export async function loadEventWorkspaceData(event: Event) {
  const [members, comments, paymentSummaries] = await Promise.all([
    listEventMembers(event.id),
    listEventComments(event.id),
    listEventPaymentSummaries(event.id),
  ]);

  const { expenses, settlements, settlementPayments } = event.expenses_enabled
    ? await loadEventSettlements(event.id, members)
    : {
        expenses: [] as Expense[],
        settlements: [] as Settlement[],
        settlementPayments: [] as SettlementPayment[],
      };

  return {
    event,
    members: members.map(toPublicEventMember),
    comments,
    expenses,
    settlements,
    settlementPayments,
    paymentSummaries,
    paymentMethods: await payeePaymentMethods(
      settlements,
      ticketPaidWithHandles(event)
        ? members.find((member) => member.role === "owner")?.id
        : null,
    ),
  };
}

export type EventWorkspaceData = Awaited<ReturnType<typeof loadEventWorkspaceData>>;
