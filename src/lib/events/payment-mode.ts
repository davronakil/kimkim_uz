export const eventPaymentModes = ["free", "split", "pay_yourself", "paid"] as const;

export type EventPaymentMode = (typeof eventPaymentModes)[number];

export const defaultPaymentMode: EventPaymentMode = "free";

export function isEventPaymentMode(value: string): value is EventPaymentMode {
  return (eventPaymentModes as readonly string[]).includes(value);
}

export function parsePaymentMode(value: FormDataEntryValue | null): EventPaymentMode {
  if (typeof value === "string" && isEventPaymentMode(value)) {
    return value;
  }
  return defaultPaymentMode;
}
