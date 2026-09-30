import { nanoid } from "nanoid";
import { getMediaBucket } from "@/lib/cloudflare";
import {
  countAlbumPhotos,
  deleteAlbumPhotoRecord,
  getAlbumPhoto,
  insertAlbumPhotoIfRoom,
} from "@/lib/db/album-queries";
import { albumCapacity, albumPlanForEvent } from "@/lib/album/limits";
import { readAlbumImageSize, transcodeAlbumImage } from "@/lib/album/images";
import { extensionForMime, sniffMedia } from "@/lib/album/sniff";
import type { AlbumPhoto, AlbumPhotoRecord, AlbumPhotoSource, User } from "@/types";

const MAX_INCOMING_BYTES = 20 * 1024 * 1024;
const MAX_OPTIMIZED_BYTES = 2.5 * 1024 * 1024;
const MAX_PASSTHROUGH_BYTES = 8 * 1024 * 1024;
const MAX_THUMB_BYTES = 800 * 1024;
const FULL_EDGE = 2560;
const FULL_QUALITY = 90;
const THUMB_EDGE = 960;
const THUMB_QUALITY = 80;

export type AlbumUploadError =
  | "album_full"
  | "video_unavailable"
  | "not_image"
  | "unreadable"
  | "too_large";

export type AddAlbumPhotoResult =
  | {
      ok: true;
      photo: AlbumPhoto;
      count: number;
      limit: number;
      remaining: number;
    }
  | { ok: false; error: AlbumUploadError };

const PASSTHROUGH_MIMES = new Set<string>(["image/jpeg", "image/png", "image/webp"]);

export function toPublicAlbumPhoto(photo: AlbumPhotoRecord): AlbumPhoto {
  return {
    id: photo.id,
    event_id: photo.event_id,
    user_id: photo.user_id,
    width: photo.width,
    height: photo.height,
    byte_size: photo.byte_size,
    mime_type: photo.mime_type,
    source: photo.source,
    created_at: photo.created_at,
    first_name: photo.first_name,
    last_name: photo.last_name,
    username: photo.username,
  };
}

function saneDimension(value: number) {
  return Number.isFinite(value) && value > 0 && value <= 20000 ? Math.round(value) : 0;
}

async function removeObjects(keys: Array<string | null | undefined>) {
  const media = await getMediaBucket();
  const unique = [...new Set(keys.filter((key): key is string => Boolean(key)))];
  await Promise.all(
    unique.map(async (key) => {
      try {
        await media.delete(key);
      } catch (error) {
        console.error("Album object delete failed:", key, error);
      }
    }),
  );
}

export async function addEventAlbumPhoto(input: {
  eventId: string;
  user: Pick<User, "id" | "first_name" | "last_name" | "username">;
  bytes: ArrayBuffer;
  source: AlbumPhotoSource;
  optimized: boolean;
  width?: number;
  height?: number;
  thumbBytes?: ArrayBuffer | null;
}): Promise<AddAlbumPhotoResult> {
  if (input.bytes.byteLength > MAX_INCOMING_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const sniffed = sniffMedia(new Uint8Array(input.bytes));
  if (sniffed.kind === "video") return { ok: false, error: "video_unavailable" };
  if (input.bytes.byteLength < 32 || sniffed.kind !== "image") {
    return { ok: false, error: "not_image" };
  }

  const plan = albumPlanForEvent(input.eventId);
  let width = saneDimension(input.width ?? 0);
  let height = saneDimension(input.height ?? 0);
  let fullBytes = input.bytes;
  let mime: string = sniffed.mime;

  const measured = await readAlbumImageSize(fullBytes);
  if (measured) {
    width = measured.width;
    height = measured.height;
  }

  const canPassthrough =
    input.optimized &&
    PASSTHROUGH_MIMES.has(mime) &&
    fullBytes.byteLength <= MAX_OPTIMIZED_BYTES &&
    width > 0 &&
    height > 0 &&
    width <= FULL_EDGE &&
    height <= FULL_EDGE;

  if (!canPassthrough) {
    const transcoded = await transcodeAlbumImage(fullBytes, {
      maxEdge: FULL_EDGE,
      format: "image/webp",
      quality: FULL_QUALITY,
    });
    if (transcoded) {
      fullBytes = transcoded.bytes;
      mime = transcoded.mime.startsWith("image/") ? transcoded.mime : "image/webp";
      if (transcoded.width > 0 && transcoded.height > 0) {
        width = transcoded.width;
        height = transcoded.height;
      }
    } else if (PASSTHROUGH_MIMES.has(mime) && fullBytes.byteLength <= MAX_PASSTHROUGH_BYTES) {
      // Images binding is unavailable. Keep a browser-decoded JPEG/WebP/PNG as-is.
    } else {
      return { ok: false, error: "unreadable" };
    }
  }

  let thumbBytes: ArrayBuffer | null = null;
  let thumbMime = "image/webp";
  if (input.thumbBytes && input.thumbBytes.byteLength > 0 && input.thumbBytes.byteLength <= MAX_THUMB_BYTES) {
    const thumbSniff = sniffMedia(new Uint8Array(input.thumbBytes));
    if (thumbSniff.kind === "image" && PASSTHROUGH_MIMES.has(thumbSniff.mime)) {
      thumbBytes = input.thumbBytes;
      thumbMime = thumbSniff.mime;
    }
  }
  if (!thumbBytes) {
    const thumb = await transcodeAlbumImage(fullBytes, {
      maxEdge: THUMB_EDGE,
      format: "image/webp",
      quality: THUMB_QUALITY,
    });
    if (thumb) {
      thumbBytes = thumb.bytes;
      thumbMime = thumb.mime.startsWith("image/") ? thumb.mime : "image/webp";
    }
  }

  const photoId = nanoid();
  const storageKey = `albums/${input.eventId}/${photoId}.${extensionForMime(mime)}`;
  const thumbKey = thumbBytes
    ? `albums/${input.eventId}/${photoId}-thumb.${extensionForMime(thumbMime)}`
    : null;

  const media = await getMediaBucket();
  await media.put(storageKey, fullBytes, { httpMetadata: { contentType: mime } });
  if (thumbKey && thumbBytes) {
    await media.put(thumbKey, thumbBytes, { httpMetadata: { contentType: thumbMime } });
  }

  try {
    const inserted = await insertAlbumPhotoIfRoom({
      id: photoId,
      eventId: input.eventId,
      userId: input.user.id,
      storageKey,
      thumbKey,
      width: width || null,
      height: height || null,
      byteSize: fullBytes.byteLength,
      mimeType: mime,
      source: input.source,
      limit: plan.maxPhotos,
    });

    if (!inserted) {
      await removeObjects([storageKey, thumbKey]);
      return { ok: false, error: "album_full" };
    }
  } catch (error) {
    await removeObjects([storageKey, thumbKey]);
    throw error;
  }

  const stored = await getAlbumPhoto(input.eventId, photoId);
  const count = await countAlbumPhotos(input.eventId);
  const capacity = albumCapacity(count, plan);
  const photo = stored
    ? toPublicAlbumPhoto(stored)
    : {
        id: photoId,
        event_id: input.eventId,
        user_id: input.user.id,
        width: width || null,
        height: height || null,
        byte_size: fullBytes.byteLength,
        mime_type: mime,
        source: input.source,
        created_at: new Date().toISOString(),
        first_name: input.user.first_name,
        last_name: input.user.last_name,
        username: input.user.username,
      };

  return { ok: true, photo, ...capacity, count };
}

export async function removeEventAlbumPhoto(eventId: string, photoId: string) {
  const removed = await deleteAlbumPhotoRecord(eventId, photoId);
  if (!removed) return false;
  await removeObjects([removed.storage_key, removed.thumb_key]);
  return true;
}
