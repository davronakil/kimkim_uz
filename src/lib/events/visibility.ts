export const eventVisibilityModes = ["private", "public"] as const;

export type EventVisibility = (typeof eventVisibilityModes)[number];

export const defaultEventVisibility: EventVisibility = "private";

export function parseEventVisibility(value: FormDataEntryValue | null): EventVisibility {
  return value === "public" ? "public" : "private";
}

export function isPublicEvent(visibility: string | null | undefined): boolean {
  return visibility === "public";
}
