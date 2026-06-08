import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";

export async function GET() {
  const env = await getEnv();

  return NextResponse.json({
    googleMapsApiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });
}
