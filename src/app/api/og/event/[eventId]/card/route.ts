import { NextResponse } from "next/server";
import { getEventById } from "@/lib/db/queries";
import { isLocale } from "@/lib/locale";
import { renderEventCardSvg } from "@/lib/og/render-event-card-svg";
import { svgToPng } from "@/lib/og/svg-to-png";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

const cacheHeaders = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale") ?? "en";
  const locale = isLocale(localeParam) ? localeParam : "en";
  const format = url.searchParams.get("format");

  const event = await getEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (format === "svg") {
    const svg = renderEventCardSvg(event, locale);
    return new NextResponse(svg, {
      headers: {
        ...cacheHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
      },
    });
  }

  const svgForPng = renderEventCardSvg(event, locale, { includeEmoji: false });
  const png = await svgToPng(svgForPng);

  if (png) {
    return new NextResponse(png.buffer as ArrayBuffer, {
      headers: {
        ...cacheHeaders,
        "Content-Type": "image/png",
      },
    });
  }

  const svg = renderEventCardSvg(event, locale);
  return new NextResponse(svg, {
    headers: {
      ...cacheHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
