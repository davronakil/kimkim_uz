export type SniffedMedia =
  | {
      kind: "image";
      mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/heic";
    }
  | { kind: "video" }
  | { kind: "unknown" };

const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "mif1",
  "msf1",
]);

function brandAt(bytes: Uint8Array, offset: number) {
  if (bytes.length < offset + 4) return "";
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  ).toLowerCase();
}

/** Identify a photo or video from magic bytes. SVG and other markup are unknown. */
export function sniffMedia(bytes: Uint8Array): SniffedMedia {
  if (bytes.length < 12) return { kind: "unknown" };

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { kind: "image", mime: "image/jpeg" };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { kind: "image", mime: "image/png" };
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { kind: "image", mime: "image/gif" };
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    brandAt(bytes, 8) === "webp"
  ) {
    return { kind: "image", mime: "image/webp" };
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { kind: "video" };
  }

  if (brandAt(bytes, 4) === "ftyp") {
    const brand = brandAt(bytes, 8);
    if (HEIC_BRANDS.has(brand)) return { kind: "image", mime: "image/heic" };
    return { kind: "video" };
  }

  return { kind: "unknown" };
}

export function extensionForMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/heic" || mime === "image/heif") return "heic";
  return "jpg";
}
