import { nanoid } from "nanoid";
import { runInBackground } from "@/lib/cloudflare";
import {
  deleteSettlementPayment,
  deleteSettleUp,
  getSettlementPayment,
  insertSettlementPayments,
  isEventMember,
  isEventOwner,
} from "@/lib/db/queries";
import { loadEventSettlements } from "@/lib/events/workspace-data";
import { canUndoSettlementPayment } from "@/lib/expense/settlement";
import { notifySettlementPaymentRecorded } from "@/lib/telegram/notifications";
import type { Event, SettlementPayment } from "@/types";

export type SettleError = "forbidden" | "disabled" | "nothing_owed" | "not_found";

export type SettleResult<T> = { ok: true; value: T } | { ok: false; error: SettleError };

/**
 * Records the *current* amount between the actor and the counterpart in one currency.
 * The amount is always recomputed server-side, so a stale button can't over- or under-pay.
 */
export async function markSettlementPaid(input: {
  event: Event;
  actorId: string;
  counterpartId: string;
  currency: string;
}): Promise<SettleResult<SettlementPayment>> {
  const { event, actorId, counterpartId, currency } = input;
  if (!event.expenses_enabled) return { ok: false, error: "disabled" };
  if (!(await isEventMember(event.id, actorId))) return { ok: false, error: "forbidden" };

  const { settlements } = await loadEventSettlements(event.id);
  const settlement = settlements.find(
    (line) =>
      line.currency === currency &&
      ((line.from_user_id === actorId && line.to_user_id === counterpartId) ||
        (line.from_user_id === counterpartId && line.to_user_id === actorId)),
  );
  if (!settlement) return { ok: false, error: "nothing_owed" };

  const [payment] = await insertSettlementPayments(event.id, [settlement], actorId);
  void runInBackground(
    notifySettlementPaymentRecorded({ event, payment, actorId }).catch((error) =>
      console.error("[settle-up] notify failed", error),
    ),
  );
  return { ok: true, value: payment };
}

/** Owner-only: one transfer per remaining line, grouped under a shared settle_up_id. */
export async function settleUpEvent(input: {
  event: Event;
  actorId: string;
}): Promise<SettleResult<{ settleUpId: string; payments: SettlementPayment[] }>> {
  const { event, actorId } = input;
  if (!event.expenses_enabled) return { ok: false, error: "disabled" };
  if (!(await isEventOwner(event.id, actorId))) return { ok: false, error: "forbidden" };

  const { settlements } = await loadEventSettlements(event.id);
  if (settlements.length === 0) return { ok: false, error: "nothing_owed" };

  const settleUpId = nanoid();
  const payments = await insertSettlementPayments(event.id, settlements, actorId, settleUpId);
  return { ok: true, value: { settleUpId, payments } };
}

export async function undoSettlementPayment(input: {
  eventId: string;
  actorId: string;
  paymentId: string;
}): Promise<SettleResult<SettlementPayment>> {
  const { eventId, actorId, paymentId } = input;
  const payment = await getSettlementPayment(eventId, paymentId);
  if (!payment) return { ok: false, error: "not_found" };

  const owner = payment.settle_up_id ? await isEventOwner(eventId, actorId) : false;
  if (!canUndoSettlementPayment(payment, actorId, owner)) {
    return { ok: false, error: "forbidden" };
  }

  await deleteSettlementPayment(eventId, paymentId);
  return { ok: true, value: payment };
}

export async function undoSettleUp(input: {
  eventId: string;
  actorId: string;
  settleUpId: string;
}): Promise<SettleResult<number>> {
  const { eventId, actorId, settleUpId } = input;
  if (!(await isEventOwner(eventId, actorId))) return { ok: false, error: "forbidden" };
  const removed = await deleteSettleUp(eventId, settleUpId);
  if (removed === 0) return { ok: false, error: "not_found" };
  return { ok: true, value: removed };
}

export function settleErrorStatus(error: SettleError): number {
  switch (error) {
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "disabled":
    case "nothing_owed":
      return 409;
  }
}
