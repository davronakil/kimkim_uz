export const businessCategories = [
  "barbershop",
  "nail_salon",
  "restaurant",
  "cafe",
  "wedding_venue",
  "photographer",
  "florist",
  "other",
] as const;

export type BusinessCategory = (typeof businessCategories)[number];
