import { NextRequest, NextResponse } from "next/server";
import { getMediaBucket } from "@/lib/cloudflare";

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { key } = await context.params;
  const objectKey = key.join("/");
  const media = await getMediaBucket();
  const object = await media.get(objectKey);

  if (!object) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType ?? "application/octet-stream",
  );
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new NextResponse(object.body, { headers });
}
