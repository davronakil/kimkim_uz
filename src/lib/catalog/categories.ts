export const businessCategories = [
  "restaurant",
  "cafe",
  "bakery",
  "catering",
  "banquet_hall",
  "event_venue",
  "dacha",
  "hotel",
  "sauna_banya",
  "photographer",
  "videographer",
  "dj",
  "mc_host",
  "decorator",
  "florist",
  "event_planner",
  "beauty_salon",
  "barbershop",
  "nail_salon",
  "gym",
  "studio",
  "travel_agency",
  "real_estate",
  "digital_marketing_agency",
  "auto_service",
  "clinic",
  "tutoring",
  "tailor",
  "cleaning_service",
  "other",
] as const;

/** Stored on older listings; displayed and filtered via {@link normalizeStoredCategory}. */
export const legacyBusinessCategories = ["wedding_venue"] as const;

export type BusinessCategory = (typeof businessCategories)[number];
export type LegacyBusinessCategory = (typeof legacyBusinessCategories)[number];
export type StoredBusinessCategory = BusinessCategory | LegacyBusinessCategory;

export function isBusinessCategory(value: string): value is BusinessCategory {
  return (businessCategories as readonly string[]).includes(value);
}

export function isStoredBusinessCategory(value: string): value is StoredBusinessCategory {
  return (
    isBusinessCategory(value) ||
    (legacyBusinessCategories as readonly string[]).includes(value)
  );
}

/** Map legacy slugs to their current category for labels, forms, and cover themes. */
export function normalizeStoredCategory(category: string): BusinessCategory {
  if (category === "wedding_venue") return "event_venue";
  if (isBusinessCategory(category)) return category;
  return "other";
}

/** DB filter values for a selected catalog category chip. */
export function categoryFilterValues(category: BusinessCategory): string[] {
  if (category === "event_venue") return ["event_venue", "wedding_venue"];
  return [category];
}
