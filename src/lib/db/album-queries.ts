import { getDb } from "@/lib/cloudflare";
import type { AlbumPhotoRecord, AlbumPhotoSource } from "@/types";

const photoColumns = `p.id, p.event_id, p.user_id, p.storage_key, p.thumb_key, p.width, p.height,
  p.byte_size, p.mime_type, p.source, p.created_at,
  u.first_name, u.last_name, u.username`;

function normalizePhoto(row: AlbumPhotoRecord): AlbumPhotoRecord {
  return {
    ...row,
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    byte_size: Number(row.byte_size),
    thumb_key: row.thumb_key ?? null,
    source: row.source === "telegram" ? "telegram" : "web",
  };
}

export async function listAlbumPhotos(eventId: string): Promise<AlbumPhotoRecord[]> {
  const db = await getDb();
  const result = await db
    .prepare(
      `SELECT ${photoColumns}
       FROM event_album_photos p
       JOIN users u ON u.id = p.user_id
       WHERE p.event_id = ?
       ORDER BY p.created_at ASC, p.id ASC`,
    )
    .bind(eventId)
    .all<AlbumPhotoRecord>();

  return (result.results ?? []).map(normalizePhoto);
}

export async function getAlbumPhoto(
  eventId: string,
  photoId: string,
): Promise<AlbumPhotoRecord | null> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT ${photoColumns}
       FROM event_album_photos p
       JOIN users u ON u.id = p.user_id
       WHERE p.event_id = ? AND p.id = ?`,
    )
    .bind(eventId, photoId)
    .first<AlbumPhotoRecord>();

  return row ? normalizePhoto(row) : null;
}

export async function countAlbumPhotos(eventId: string): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM event_album_photos WHERE event_id = ?")
    .bind(eventId)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

export async function countRecentAlbumPhotos(
  eventId: string,
  userId: string,
  minutes = 30,
): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM event_album_photos
       WHERE event_id = ? AND user_id = ?
         AND created_at >= datetime('now', ?)`,
    )
    .bind(eventId, userId, `-${minutes} minutes`)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

/**
 * Insert only when the event is still under the photo cap.
 * The count check and insert are one statement so two uploads can't both slip past a full album.
 */
export async function insertAlbumPhotoIfRoom(input: {
  id: string;
  eventId: string;
  userId: string;
  storageKey: string;
  thumbKey: string | null;
  width: number | null;
  height: number | null;
  byteSize: number;
  mimeType: string;
  source: AlbumPhotoSource;
  limit: number;
}): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .prepare(
      `INSERT INTO event_album_photos (
         id, event_id, user_id, storage_key, thumb_key, width, height, byte_size, mime_type, source
       )
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE (SELECT COUNT(*) FROM event_album_photos WHERE event_id = ?) < ?`,
    )
    .bind(
      input.id,
      input.eventId,
      input.userId,
      input.storageKey,
      input.thumbKey,
      input.width,
      input.height,
      input.byteSize,
      input.mimeType,
      input.source,
      input.eventId,
      input.limit,
    )
    .run();

  if ((result.meta?.changes ?? 0) > 0) return true;

  const existing = await db
    .prepare("SELECT 1 AS ok FROM event_album_photos WHERE id = ?")
    .bind(input.id)
    .first<{ ok: number }>();
  return Boolean(existing);
}

export async function deleteAlbumPhotoRecord(
  eventId: string,
  photoId: string,
): Promise<AlbumPhotoRecord | null> {
  const existing = await getAlbumPhoto(eventId, photoId);
  if (!existing) return null;

  const db = await getDb();
  await db
    .prepare("DELETE FROM event_album_photos WHERE event_id = ? AND id = ?")
    .bind(eventId, photoId)
    .run();

  return existing;
}
