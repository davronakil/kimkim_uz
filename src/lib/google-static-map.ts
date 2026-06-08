import { getEnv } from "@/lib/cloudflare";

export async function resolveServerGoogleMapsApiKey(): Promise<string> {
  try {
    const env = await getEnv();
    return env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  } catch {
    return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  }
}

export function buildGoogleStaticMapUrl(options: {
  lat: number;
  lng: number;
  apiKey: string;
  width?: number;
  height?: number;
  zoom?: number;
}): string {
  const { lat, lng, apiKey, width = 600, height = 315, zoom = 15 } = options;

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: "2",
    maptype: "roadmap",
    markers: `color:0x10b981|${lat},${lng}`,
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
