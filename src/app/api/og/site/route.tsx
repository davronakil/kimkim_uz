import { ImageResponse } from "next/og";
import { isLocale } from "@/lib/locale";
import { SiteCardImage } from "@/lib/og/site-card-image";

const cacheHeaders = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: Request) {
  const localeParam = new URL(request.url).searchParams.get("locale") ?? "en";
  const locale = isLocale(localeParam) ? localeParam : "en";

  return new ImageResponse(<SiteCardImage locale={locale} />, {
    width: 1200,
    height: 630,
    headers: {
      ...cacheHeaders,
    },
  });
}
