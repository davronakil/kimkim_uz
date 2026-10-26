import { nanoid } from "nanoid";
import { extensionForMime, sniffMedia } from "@/lib/album/sniff";
import { getMediaBucket } from "@/lib/cloudflare";

const MAX_COVER_BYTES = 8 * 1024 * 1024;
const COVER_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type CoverUploadError = "too_large" | "not_image";

export type CoverUploadResult =
  | { ok: true; key: string; contentType: string }
  | { ok: false; error: CoverUploadError };

/**
 * Store a cover image under a fixed prefix with sniffed Content-Type and a safe key.
 * Rejects SVG/HTML and other non-raster types that would be dangerous if served inline.
 */
export async function putCoverImage(
  prefix: "events" | "catalog",
  entityId: string,
  file: File,
): Promise<CoverUploadResult> {
  if (file.size <= 0 || file.size > MAX_COVER_BYTES) {
    return { ok: false, error: "too_large" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffMedia(bytes);
  if (sniffed.kind !== "image" || !COVER_MIMES.has(sniffed.mime)) {
    return { ok: false, error: "not_image" };
  }

  const ext = extensionForMime(sniffed.mime);
  const key = `${prefix}/${entityId}/${Date.now()}-${nanoid(10)}.${ext}`;
  const media = await getMediaBucket();
  await media.put(key, bytes, {
    httpMetadata: { contentType: sniffed.mime },
  });

  return { ok: true, key, contentType: sniffed.mime };
}
