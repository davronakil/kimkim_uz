/**
 * Shared album capacity.
 *
 * Free events hold 20 photos. A future paid plan raises that to 1,000 photos
 * and 1,000 videos — the numbers live here so billing can switch plans without
 * rewriting upload checks. Video bytes are not stored yet (`ALBUM_VIDEO_ENABLED`).
 */

export const ALBUM_VIDEO_ENABLED = false;

export const ALBUM_PLANS = {
  free: {
    id: "free",
    maxPhotos: 20,
    maxVideos: 0,
  },
  pro: {
    id: "pro",
    maxPhotos: 1000,
    maxVideos: 1000,
  },
} as const;

export type AlbumPlanId = keyof typeof ALBUM_PLANS;
export type AlbumPlan = (typeof ALBUM_PLANS)[AlbumPlanId];

/** Every event is on the free album until a paid plan is wired up. */
export function albumPlanForEvent(eventId?: string): AlbumPlan {
  void eventId;
  return ALBUM_PLANS.free;
}

export function albumAllowsVideo(plan: AlbumPlan = albumPlanForEvent()): boolean {
  return ALBUM_VIDEO_ENABLED && plan.maxVideos > 0;
}

export function albumCapacity(count: number, plan: AlbumPlan = albumPlanForEvent()) {
  const safeCount = Math.max(0, count);
  return {
    plan: plan.id,
    limit: plan.maxPhotos,
    count: safeCount,
    remaining: Math.max(0, plan.maxPhotos - safeCount),
    allowsVideo: albumAllowsVideo(plan),
  };
}
