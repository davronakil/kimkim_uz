import { NextResponse } from "next/server";
import { getEventById } from "@/lib/db/queries";
import { isLocale } from "@/lib/locale";
import { renderEventCardSvg } from "@/lib/og/render-event-card-svg";

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

  const svg = renderEventCardSvg(event, locale);

  return new NextResponse(svg, {
    headers: {
      ...cacheHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
