import { NextRequest, NextResponse } from "next/server";
import { getMediaBucket } from "@/lib/cloudflare";

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

const PUBLIC_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function GET(_request: NextRequest, context: RouteContext) {
  const { key } = await context.params;
  const objectKey = key.join("/");
  if (objectKey.startsWith("albums/") || objectKey.split("/").includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const media = await getMediaBucket();
  const object = await media.get(objectKey);

  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const storedType = object.httpMetadata?.contentType ?? "application/octet-stream";
  const isPublicImage = PUBLIC_IMAGE_TYPES.has(storedType);
  const headers = new Headers();
  headers.set("Content-Type", isPublicImage ? storedType : "application/octet-stream");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (!isPublicImage) {
    headers.set("Content-Disposition", "attachment");
  }

  return new NextResponse(object.body, { headers });
}
