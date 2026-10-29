/** `pm:<eventId>:<counterpartId>:<currency>` — about 50 bytes, under Telegram's 64. */
export function markPaidCallbackData(eventId: string, counterpartId: string, currency: string) {
  return `pm:${eventId}:${counterpartId}:${currency}`;
}

export function parseMarkPaidCallbackData(data: string) {
  if (!data.startsWith("pm:")) return null;
  const [, eventId, counterpartId, currency] = data.split(":");
  if (!eventId || !counterpartId || !currency) return null;
  return { eventId, counterpartId, currency };
}

export function undoPaymentCallbackData(eventId: string, paymentId: string) {
  return `pu:${eventId}:${paymentId}`;
}

export function parseUndoPaymentCallbackData(data: string) {
  if (!data.startsWith("pu:")) return null;
  const [, eventId, paymentId] = data.split(":");
  if (!eventId || !paymentId) return null;
  return { eventId, paymentId };
}
