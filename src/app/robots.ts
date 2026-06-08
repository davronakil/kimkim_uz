import type { MetadataRoute } from "next";
import { appBaseUrl, absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = appBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/og/", "/api/media/"],
      disallow: ["/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml", baseUrl),
    host: baseUrl,
  };
}
