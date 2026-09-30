import { z } from "zod";
import {
  areExpensesEnabledByDefault,
  defaultPaymentMode,
  eventPaymentModes,
  isEventPaymentMode,
} from "@/lib/events/payment-mode";
import {
  DEFAULT_EVENT_TIMEZONE,
  isValidTimeZone,
  normalizeEventTimestamp,
} from "@/lib/events/timezone";
import { defaultEventVisibility, eventVisibilityModes } from "@/lib/events/visibility";
import { majorToCents } from "@/lib/utils";

export const eventCurrencies = ["UZS", "USD"] as const;

export const eventFormSchema = z
  .object({
    title: z.string().min(2).max(120),
    description: z.string().max(5000).optional(),
    starts_at: z.string(),
    ends_at: z.string().optional(),
    timezone: z.string().refine(isValidTimeZone),
    location_name: z.string().optional(),
    location_address: z.string().optional(),
    location_lat: z.number().optional(),
    location_lng: z.number().optional(),
    payment_mode: z.enum(eventPaymentModes).default(defaultPaymentMode),
    expenses_enabled: z.preprocess(
      (value) => value === true || value === "true" || value === "1" || value === "on",
      z.boolean(),
    ),
    expense_currency: z.enum(eventCurrencies).default("UZS"),
    ticket_price: z.coerce.number().optional(),
    ticket_currency: z.enum(eventCurrencies).default("UZS"),
    visibility: z.enum(eventVisibilityModes).default(defaultEventVisibility),
    max_guests: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z.coerce.number().int().min(1).max(500).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.payment_mode === "paid" && (!data.ticket_price || data.ticket_price <= 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["ticket_price"],
        message: "Ticket price is required for paid events",
      });
    }
  });

export function resolveTicketPriceCents(paymentMode: string, ticketPrice?: number) {
  if (paymentMode !== "paid" || !ticketPrice || ticketPrice <= 0) {
    return null;
  }
  return majorToCents(ticketPrice);
}

export function parseEventFormData(formData: FormData) {
  const lat = formData.get("location_lat");
  const lng = formData.get("location_lng");
  const rawPaymentMode = formData.get("payment_mode");
  const paymentMode =
    typeof rawPaymentMode === "string" && isEventPaymentMode(rawPaymentMode)
      ? rawPaymentMode
      : defaultPaymentMode;
  const rawExpensesEnabled = formData.get("expenses_enabled");
  const rawTimezone = formData.get("timezone");

  return eventFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at") || undefined,
    timezone:
      typeof rawTimezone === "string" && isValidTimeZone(rawTimezone)
        ? rawTimezone
        : DEFAULT_EVENT_TIMEZONE,
    location_name: formData.get("location_name") || undefined,
    location_address: formData.get("location_address") || undefined,
    location_lat: lat ? Number(lat) : undefined,
    location_lng: lng ? Number(lng) : undefined,
    payment_mode: paymentMode,
    expenses_enabled:
      rawExpensesEnabled ?? String(areExpensesEnabledByDefault(paymentMode)),
    expense_currency: formData.get("expense_currency") || "UZS",
    ticket_price: formData.get("ticket_price") || undefined,
    ticket_currency: formData.get("ticket_currency") || "UZS",
    visibility: formData.get("visibility") || defaultEventVisibility,
    max_guests: formData.get("max_guests") || undefined,
  });
}

/**
 * The form posts wall-clock readings plus the zone they were typed in; the
 * database only ever holds UTC instants.
 */
export function resolveEventTimestamps(data: {
  starts_at: string;
  ends_at?: string;
  timezone: string;
}): { startsAt: string; endsAt: string | null } | null {
  const startsAt = normalizeEventTimestamp(data.starts_at, data.timezone);
  if (!startsAt) return null;

  return { startsAt, endsAt: normalizeEventTimestamp(data.ends_at, data.timezone) };
}
