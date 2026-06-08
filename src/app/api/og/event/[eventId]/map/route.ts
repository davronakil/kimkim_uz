import { NextResponse } from "next/server";
import { getEventById } from "@/lib/db/queries";
import {
  buildGoogleStaticMapUrl,
  resolveServerGoogleMapsApiKey,
} from "@/lib/google-static-map";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const event = await getEventById(eventId);

  if (!event || event.location_lat == null || event.location_lng == null) {
    return NextResponse.json({ error: "Map not available" }, { status: 404 });
  }

  const apiKey = await resolveServerGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Maps not configured" }, { status: 503 });
  }

  const mapUrl = buildGoogleStaticMapUrl({
    lat: event.location_lat,
    lng: event.location_lng,
    apiKey,
  });

  const mapResponse = await fetch(mapUrl);
  if (!mapResponse.ok) {
    return NextResponse.json({ error: "Failed to load map" }, { status: 502 });
  }

  const contentType = mapResponse.headers.get("content-type") ?? "image/png";

  return new NextResponse(mapResponse.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
