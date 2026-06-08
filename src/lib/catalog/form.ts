import { z } from "zod";
import { businessCategories } from "@/lib/catalog/categories";

export const businessListingFormSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(5000).optional(),
  category: z.enum(businessCategories),
  phone: z.string().max(40).optional(),
  telegram_username: z.string().max(64).optional(),
  website_url: z.string().max(500).optional(),
  location_name: z.string().optional(),
  location_address: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
});

export function parseBusinessListingFormData(formData: FormData) {
  const lat = formData.get("location_lat");
  const lng = formData.get("location_lng");
  const telegram = formData.get("telegram_username");

  return businessListingFormSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    category: formData.get("category"),
    phone: formData.get("phone") || undefined,
    telegram_username:
      typeof telegram === "string" ? telegram.replace(/^@/, "").trim() || undefined : undefined,
    website_url: formData.get("website_url") || undefined,
    location_name: formData.get("location_name") || undefined,
    location_address: formData.get("location_address") || undefined,
    location_lat: lat ? Number(lat) : undefined,
    location_lng: lng ? Number(lng) : undefined,
  });
}
