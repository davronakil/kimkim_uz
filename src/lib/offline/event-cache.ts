type CachedEventPayload = {
  cachedAt: number;
  data: unknown;
};

const PREFIX = "kimkim:event:";

export function cacheEventDetail(eventId: string, data: unknown) {
  if (typeof window === "undefined") return;

  try {
    const payload: CachedEventPayload = { cachedAt: Date.now(), data };
    localStorage.setItem(`${PREFIX}${eventId}`, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export function getCachedEventDetail<T>(eventId: string): { cachedAt: number; data: T } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(`${PREFIX}${eventId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEventPayload;
    if (!parsed?.data) return null;
    return { cachedAt: parsed.cachedAt, data: parsed.data as T };
  } catch {
    return null;
  }
}
