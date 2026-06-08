import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { getEventById } from "@/lib/db/queries";
import { isLocale } from "@/lib/locale";
import { EventCardImage } from "@/lib/og/event-card-image";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

const cacheHeaders = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const localeParam = new URL(request.url).searchParams.get("locale") ?? "en";
  const locale = isLocale(localeParam) ? localeParam : "en";

  const event = await getEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return new ImageResponse(<EventCardImage event={event} locale={locale} />, {
    width: 1200,
    height: 630,
    headers: {
      ...cacheHeaders,
    },
  });
}
