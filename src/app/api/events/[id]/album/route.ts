import { NextRequest, NextResponse } from "next/server";
import { requireAlbumMember } from "@/lib/album/access";
import { albumCapacity, albumPlanForEvent } from "@/lib/album/limits";
import { addEventAlbumPhoto, toPublicAlbumPhoto } from "@/lib/album/store";
import type { AlbumUploadError } from "@/lib/album/store";
import { listAlbumPhotos } from "@/lib/db/album-queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ERROR_STATUS: Record<AlbumUploadError, number> = {
  album_full: 409,
  video_unavailable: 415,
  not_image: 415,
  unreadable: 422,
  too_large: 413,
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: eventId } = await context.params;
  const access = await requireAlbumMember(eventId);
  if (!access.ok) return access.response;

  const photos = await listAlbumPhotos(eventId);
  return NextResponse.json({
    photos: photos.map(toPublicAlbumPhoto),
    ...albumCapacity(photos.length, albumPlanForEvent(eventId)),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: eventId } = await context.params;
  const access = await requireAlbumMember(eventId);
  if (!access.ok) return access.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "not_image" }, { status: 415 });
  }

  const photo = form.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "not_image" }, { status: 415 });
  }

  const thumb = form.get("thumb");
  const width = Number(form.get("width") ?? 0);
  const height = Number(form.get("height") ?? 0);
  const result = await addEventAlbumPhoto({
    eventId,
    user: access.user,
    bytes: await photo.arrayBuffer(),
    source: "web",
    optimized: form.get("optimized") === "1",
    width,
    height,
    thumbBytes: thumb instanceof File ? await thumb.arrayBuffer() : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: ERROR_STATUS[result.error] });
  }

  return NextResponse.json(result);
}
