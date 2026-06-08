import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { processEventReminders } from "@/lib/telegram/notifications";

export async function GET(request: NextRequest) {
  const env = await getEnv();
  const secret = env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await processEventReminders();
  return NextResponse.json({ ok: true });
}
