import { NextRequest, NextResponse } from "next/server";
import { requireAlbumMember } from "@/lib/album/access";
import { removeEventAlbumPhoto } from "@/lib/album/store";
import { getAlbumPhoto } from "@/lib/db/album-queries";

type RouteContext = {
  params: Promise<{ id: string; photoId: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id: eventId, photoId } = await context.params;
  const access = await requireAlbumMember(eventId);
  if (!access.ok) return access.response;

  const photo = await getAlbumPhoto(eventId, photoId);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (photo.user_id !== access.user.id && !access.owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await removeEventAlbumPhoto(eventId, photoId);
  return NextResponse.json({ ok: true });
}
