import { NextRequest, NextResponse } from "next/server";
import { requireAlbumMember } from "@/lib/album/access";
import { getMediaBucket } from "@/lib/cloudflare";
import { getAlbumPhoto } from "@/lib/db/album-queries";

type RouteContext = {
  params: Promise<{ id: string; photoId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: eventId, photoId } = await context.params;
  const access = await requireAlbumMember(eventId);
  if (!access.ok) return access.response;

  const photo = await getAlbumPhoto(eventId, photoId);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const variant = request.nextUrl.searchParams.get("variant");
  const key = variant === "thumb" ? (photo.thumb_key ?? photo.storage_key) : photo.storage_key;
  const media = await getMediaBucket();
  const object = await media.get(key);
  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType ?? photo.mime_type);
  headers.set("Cache-Control", "private, max-age=86400");
  headers.set("Content-Disposition", "inline");
  if (object.size) headers.set("Content-Length", String(object.size));

  return new NextResponse(object.body, { headers });
}
