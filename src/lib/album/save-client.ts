import { buildStoredZip } from "@/lib/album/zip";
import { extensionForMime } from "@/lib/album/sniff";

export type SaveAlbumFile = {
  id: string;
  url: string;
  name: string;
};

function slug(title: string) {
  const cleaned = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return cleaned || "event";
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]!, index);
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => run()));
  return results;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function wantsNativeShare(files: File[]) {
  const ua = navigator.userAgent;
  const touchMac = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua) || touchMac;
  if (!mobile || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

async function asShareFile(blob: Blob, name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "photo";
  if (blob.type === "image/jpeg") {
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return new File([blob], `${base}.${extensionForMime(blob.type)}`, {
        type: blob.type || "image/jpeg",
      });
    }
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const jpeg = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), "image/jpeg", 0.92);
    });
    if (jpeg) return new File([jpeg], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    // Fall through and share the original bytes.
  }

  return new File([blob], `${base}.${extensionForMime(blob.type)}`, {
    type: blob.type || "application/octet-stream",
  });
}

/**
 * One action saves photos other people added.
 * Phones that can hand files to the system share sheet do that, so Save to Photos is one tap away.
 * Everywhere else, a single zip downloads immediately.
 */
export async function saveSharedPhotos(input: {
  eventTitle: string;
  photos: SaveAlbumFile[];
  onProgress?: (done: number, total: number) => void;
}): Promise<"shared" | "downloaded" | "cancelled"> {
  const total = input.photos.length;
  if (total === 0) return "downloaded";

  const files = await mapPool(input.photos, 4, async (photo, index) => {
    const response = await fetch(photo.url);
    if (!response.ok) throw new Error("download failed");
    const blob = await response.blob();
    input.onProgress?.(index + 1, total);
    const type = blob.type || response.headers.get("Content-Type") || "image/jpeg";
    const named = new Blob([blob], { type });
    return { photo, blob: named };
  });

  const shareFiles = await Promise.all(
    files.map((file) => asShareFile(file.blob, file.photo.name)),
  );

  if (wantsNativeShare(shareFiles)) {
    try {
      await navigator.share({
        files: shareFiles,
        title: input.eventTitle,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  const entries = await Promise.all(
    files.map(async (file, index) => ({
      name: `${String(index + 1).padStart(2, "0")}-${file.photo.name}.${extensionForMime(file.blob.type)}`,
      data: new Uint8Array(await file.blob.arrayBuffer()),
    })),
  );
  const zip = buildStoredZip(entries);
  const archive = new Uint8Array(zip.byteLength);
  archive.set(zip);
  triggerDownload(
    new Blob([archive], { type: "application/zip" }),
    `${slug(input.eventTitle)}-photos.zip`,
  );
  return "downloaded";
}
