export const eventUseCaseKeys = [
  "wedding",
  "gap",
  "birthday",
  "choyxona",
  "soccer",
  "hunting",
  "fishing",
  "camping",
  "picnic",
] as const;

export type EventUseCaseKey = (typeof eventUseCaseKeys)[number];
