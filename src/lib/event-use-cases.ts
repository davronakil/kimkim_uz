export const eventUseCaseKeys = [
  "wedding",
  "gap",
  "birthday",
  "choyxona",
] as const;

export type EventUseCaseKey = (typeof eventUseCaseKeys)[number];
