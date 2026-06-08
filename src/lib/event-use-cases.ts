export const eventUseCaseKeys = [
  "wedding",
  "gap",
  "birthday",
  "choyxona",
  "sunnat",
  "aqiqa",
  "challari",
] as const;

export type EventUseCaseKey = (typeof eventUseCaseKeys)[number];
