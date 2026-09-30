/**
 * Prepare a photo for upload in the browser.
 *
 * Phone cameras save multi-megabyte JPEGs. We decode once, scale the long edge
 * down to 2560px (never up), and encode WebP at 0.92 — visually lossless on a
 * screen, and typically a fraction of the original size. Canvas redraw also
 * drops EXIF, including GPS. If WebP is unavailable, JPEG at the same quality
 * is the fallback. Thumbnails are a separate, smaller encode for the grid.
 */

export const ALBUM_FULL_MAX_EDGE = 2560;
export const ALBUM_FULL_QUALITY = 0.92;
export const ALBUM_THUMB_MAX_EDGE = 960;
export const ALBUM_THUMB_QUALITY = 0.8;

export type PreparedAlbumImage = {
  full: Blob;
  fullType: string;
  thumb: Blob | null;
  width: number;
  height: number;
  /** True when this file was normalized here and can be stored without another encode. */
  optimized: boolean;
};

export function fitWithin(width: number, height: number, maxEdge: number) {
  const edge = Math.max(width, height);
  if (edge <= maxEdge || edge === 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }
  const ratio = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasFrom(bitmap: ImageBitmap, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

function blobFrom(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function encode(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<{ blob: Blob; type: string; width: number; height: number } | null> {
  const size = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = canvasFrom(bitmap, size.width, size.height);
  if (!canvas) return null;

  const webp = await blobFrom(canvas, "image/webp", quality);
  if (webp && webp.size > 0) {
    return { blob: webp, type: "image/webp", width: size.width, height: size.height };
  }

  const jpeg = await blobFrom(canvas, "image/jpeg", quality);
  if (jpeg && jpeg.size > 0) {
    return { blob: jpeg, type: "image/jpeg", width: size.width, height: size.height };
  }

  return null;
}

async function decode(file: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
}

export async function prepareAlbumUpload(file: File): Promise<PreparedAlbumImage> {
  const bitmap = await decode(file);
  if (!bitmap) {
    return {
      full: file,
      fullType: file.type || "application/octet-stream",
      thumb: null,
      width: 0,
      height: 0,
      optimized: false,
    };
  }

  try {
    const full = await encode(bitmap, ALBUM_FULL_MAX_EDGE, ALBUM_FULL_QUALITY);
    if (!full) {
      return {
        full: file,
        fullType: file.type || "application/octet-stream",
        thumb: null,
        width: bitmap.width,
        height: bitmap.height,
        optimized: false,
      };
    }

    const thumbBitmap = await createImageBitmap(full.blob);
    let thumb: Blob | null = null;
    try {
      const encodedThumb = await encode(thumbBitmap, ALBUM_THUMB_MAX_EDGE, ALBUM_THUMB_QUALITY);
      thumb = encodedThumb?.blob ?? null;
    } finally {
      thumbBitmap.close();
    }

    return {
      full: full.blob,
      fullType: full.type,
      thumb,
      width: full.width,
      height: full.height,
      optimized: true,
    };
  } finally {
    bitmap.close();
  }
}
