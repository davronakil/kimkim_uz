/** People on settle-up lines besides the owner — one DM each, not one per transfer. */
export function settleUpNotifyRecipientIds(
  payments: Array<{ from_user_id: string; to_user_id: string }>,
  actorId: string,
): string[] {
  const ids = new Set<string>();
  for (const payment of payments) {
    if (payment.from_user_id !== actorId) ids.add(payment.from_user_id);
    if (payment.to_user_id !== actorId) ids.add(payment.to_user_id);
  }
  return [...ids];
}
