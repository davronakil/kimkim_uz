import { z } from "zod";
import { defaultPaymentMode, eventPaymentModes } from "@/lib/events/payment-mode";
import { defaultEventVisibility, eventVisibilityModes } from "@/lib/events/visibility";
import { majorToCents } from "@/lib/utils";

const ticketCurrencies = ["UZS", "USD"] as const;

export const eventFormSchema = z
  .object({
    title: z.string().min(2).max(120),
    description: z.string().max(5000).optional(),
    starts_at: z.string(),
    ends_at: z.string().optional(),
    location_name: z.string().optional(),
    location_address: z.string().optional(),
    location_lat: z.number().optional(),
    location_lng: z.number().optional(),
    payment_mode: z.enum(eventPaymentModes).default(defaultPaymentMode),
    ticket_price: z.coerce.number().optional(),
    ticket_currency: z.enum(ticketCurrencies).default("UZS"),
    visibility: z.enum(eventVisibilityModes).default(defaultEventVisibility),
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

  return eventFormSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at") || undefined,
    location_name: formData.get("location_name") || undefined,
    location_address: formData.get("location_address") || undefined,
    location_lat: lat ? Number(lat) : undefined,
    location_lng: lng ? Number(lng) : undefined,
    payment_mode: formData.get("payment_mode") || defaultPaymentMode,
    ticket_price: formData.get("ticket_price") || undefined,
    ticket_currency: formData.get("ticket_currency") || "UZS",
    visibility: formData.get("visibility") || defaultEventVisibility,
  });
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
