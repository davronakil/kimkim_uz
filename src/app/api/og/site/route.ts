import { NextResponse } from "next/server";
import { isLocale } from "@/lib/locale";
import { renderSiteCardSvg } from "@/lib/og/render-site-card-svg";

const cacheHeaders = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: Request) {
  const localeParam = new URL(request.url).searchParams.get("locale") ?? "en";
  const locale = isLocale(localeParam) ? localeParam : "en";
  const svg = renderSiteCardSvg(locale);

  return new NextResponse(svg, {
    headers: {
      ...cacheHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
