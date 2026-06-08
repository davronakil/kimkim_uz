import { z } from "zod";

export const eventFormSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(5000).optional(),
  starts_at: z.string(),
  ends_at: z.string().optional(),
  location_name: z.string().optional(),
  location_address: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
});

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
  });
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
