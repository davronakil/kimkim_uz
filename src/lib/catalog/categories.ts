const food = ["restaurant", "cafe", "bakery", "catering"] as const;

const venues = ["banquet_hall", "event_venue", "dacha", "hotel", "sauna_banya"] as const;

const celebrations = [
  "photographer",
  "videographer",
  "dj",
  "mc_host",
  "decorator",
  "florist",
  "event_planner",
] as const;

const personal = ["beauty_salon", "barbershop", "nail_salon", "gym", "studio", "tailor"] as const;

const home = [
  "furniture",
  "roofing",
  "restoration",
  "construction",
  "plumbing",
  "electrician",
  "hvac",
  "cleaning_service",
  "moving",
  "auto_service",
] as const;

const professional = [
  "travel_agency",
  "real_estate",
  "digital_marketing_agency",
  "legal",
  "professional_services",
  "clinic",
  "tutoring",
  "printing",
] as const;

const other = ["other"] as const;

export const categoryGroups = [
  { id: "food", categories: food },
  { id: "venues", categories: venues },
  { id: "celebrations", categories: celebrations },
  { id: "personal", categories: personal },
  { id: "home", categories: home },
  { id: "professional", categories: professional },
  { id: "other", categories: other },
] as const;

export const businessCategories = [
  ...food,
  ...venues,
  ...celebrations,
  ...personal,
  ...home,
  ...professional,
  ...other,
] as const;

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type GroupedCategory = (typeof categoryGroups)[number]["categories"][number];
type ListedCategory = (typeof businessCategories)[number];
const categoryListMatchesGroups: Expect<Equal<GroupedCategory, ListedCategory>> = true;
void categoryListMatchesGroups;

function assertUniqueCategories(categories: readonly string[]) {
  const seen = new Set<string>();
  for (const category of categories) {
    if (seen.has(category)) {
      throw new Error(`Duplicate business category: ${category}`);
    }
    seen.add(category);
  }
}

assertUniqueCategories(businessCategories);

/** Stored on older listings; displayed and filtered via {@link normalizeStoredCategory}. */
export const legacyBusinessCategories = ["wedding_venue"] as const;

export type BusinessCategory = (typeof businessCategories)[number];
export type CategoryGroupId = (typeof categoryGroups)[number]["id"];
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
