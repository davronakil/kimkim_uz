import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAlbumMember } from "@/lib/album/access";
import { albumPlanForEvent } from "@/lib/album/limits";
import { countRecentAlbumPhotos } from "@/lib/db/album-queries";
import { runInBackground } from "@/lib/cloudflare";
import { notifyAlbumPhotosAdded } from "@/lib/telegram/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: eventId } = await context.params;
  const access = await requireAlbumMember(eventId);
  if (!access.ok) return access.response;

  const limit = albumPlanForEvent(eventId).maxPhotos;
  const parsed = z.object({ count: z.number().int().min(1).max(limit) }).safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const recent = await countRecentAlbumPhotos(eventId, access.user.id);
  const count = Math.min(parsed.data.count, recent);
  if (count < 1) {
    return NextResponse.json({ error: "Nothing to announce" }, { status: 400 });
  }

  void runInBackground(
    notifyAlbumPhotosAdded({
      eventId,
      author: access.user,
      count,
    }),
  );

  return NextResponse.json({ ok: true, count });
}
