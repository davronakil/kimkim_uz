export const paymentMethodKinds = ["venmo", "cashapp", "zelle", "apple_cash"] as const;

export type PaymentMethodKind = (typeof paymentMethodKinds)[number];
export type PaymentMethodValueType = "phone" | "email" | "handle";

export type PaymentMethod = {
  kind: PaymentMethodKind;
  value: string;
  value_type: PaymentMethodValueType;
};

/** These apps only move US dollars, so handles are only offered on USD settlements. */
export const PAYMENT_METHODS_CURRENCY = "USD";

/** Paid (ticketed) USD events point guests at the host's saved handles. */
export function ticketPaidWithHandles(event: {
  payment_mode?: string | null;
  ticket_currency?: string | null;
}): boolean {
  return event.payment_mode === "paid" && event.ticket_currency === PAYMENT_METHODS_CURRENCY;
}

export type PaymentMethodError = "invalid_contact" | "invalid_venmo" | "invalid_cashtag";

type NormalizeResult =
  | { ok: true; method: PaymentMethod }
  | { ok: false; error: PaymentMethodError };

export function isPaymentMethodKind(value: unknown): value is PaymentMethodKind {
  return typeof value === "string" && (paymentMethodKinds as readonly string[]).includes(value);
}

/** Returns E.164. Bare 10-digit numbers are assumed to be US (+1). */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 && digits[0] !== "0" ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function contactMethod(kind: PaymentMethodKind, raw: string): NormalizeResult {
  if (raw.includes("@")) {
    const email = normalizeEmail(raw);
    return email
      ? { ok: true, method: { kind, value: email, value_type: "email" } }
      : { ok: false, error: "invalid_contact" };
  }
  const phone = normalizePhone(raw);
  return phone
    ? { ok: true, method: { kind, value: phone, value_type: "phone" } }
    : { ok: false, error: "invalid_contact" };
}

export function normalizePaymentMethod(kind: PaymentMethodKind, raw: string): NormalizeResult {
  const input = raw.trim();

  if (kind === "venmo") {
    const handle = input.replace(/^@/, "");
    return /^[A-Za-z0-9_-]{5,30}$/.test(handle)
      ? { ok: true, method: { kind, value: handle, value_type: "handle" } }
      : { ok: false, error: "invalid_venmo" };
  }

  if (kind === "cashapp") {
    const tag = input.replace(/^\$/, "");
    return /^(?=.*[A-Za-z])[A-Za-z0-9]{1,20}$/.test(tag)
      ? { ok: true, method: { kind, value: tag, value_type: "handle" } }
      : { ok: false, error: "invalid_cashtag" };
  }

  return contactMethod(kind, input);
}

export function formatPhone(e164: string): string {
  const us = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return us ? `+1 (${us[1]}) ${us[2]}-${us[3]}` : e164;
}

/** Human-readable handle, also what the copy button puts on the clipboard. */
export function displayPaymentValue(method: PaymentMethod): string {
  if (method.kind === "venmo") return `@${method.value}`;
  if (method.kind === "cashapp") return `$${method.value}`;
  return method.value_type === "phone" ? formatPhone(method.value) : method.value;
}

export function usdAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** A null amount (e.g. a paid event without a ticket price) opens the payee without one. */
export function venmoPayUrl(handle: string, amountCents: number | null, note: string): string {
  const amount = amountCents ? `&amount=${usdAmount(amountCents)}` : "";
  return `https://venmo.com/${encodeURIComponent(handle)}?txn=pay${amount}&note=${encodeURIComponent(note)}`;
}

export function cashAppPayUrl(cashtag: string, amountCents: number | null): string {
  const base = `https://cash.app/$${encodeURIComponent(cashtag)}`;
  return amountCents ? `${base}/${usdAmount(amountCents)}` : base;
}

/**
 * iMessage underlines a "$12.34" amount in a message and offers Apple Cash on tap.
 * Apple platforms accept `sms:<address>&body=`; only offered there.
 */
export function appleCashMessageUrl(
  address: string,
  amountCents: number | null,
  note: string,
): string {
  const body = (amountCents ? `$${usdAmount(amountCents)} ${note}` : note).trim();
  return `sms:${address}&body=${encodeURIComponent(body)}`;
}

export type PaymentDeepLink = { kind: "web" | "sms"; url: string };

export function paymentDeepLink(
  method: PaymentMethod,
  amountCents: number | null,
  note: string,
): PaymentDeepLink | null {
  if (method.kind === "venmo") return { kind: "web", url: venmoPayUrl(method.value, amountCents, note) };
  if (method.kind === "cashapp") return { kind: "web", url: cashAppPayUrl(method.value, amountCents) };
  if (method.kind === "apple_cash") {
    return { kind: "sms", url: appleCashMessageUrl(method.value, amountCents, note) };
  }
  return null;
}

export type ApplePlatformSignals = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
};

/** iPhone, iPad (including iPadOS's Macintosh UA), and Mac — where Messages handles Apple Cash. */
export function isApplePlatform(signals: ApplePlatformSignals): boolean {
  if (/iPad|iPhone|iPod|Macintosh|Mac OS X/i.test(signals.userAgent)) {
    return !/Android/i.test(signals.userAgent);
  }
  return /^(MacIntel|iPhone|iPad|iPod)$/.test(signals.platform);
}

export function sortPaymentMethods(methods: PaymentMethod[]): PaymentMethod[] {
  return [...methods].sort(
    (a, b) => paymentMethodKinds.indexOf(a.kind) - paymentMethodKinds.indexOf(b.kind),
  );
}
