import { NextRequest, NextResponse } from "next/server";
import { getEnv, runInBackground } from "@/lib/cloudflare";
import { timingSafeEqualString } from "@/lib/security/timing-safe";
import { processEventDigests, processEventReminders } from "@/lib/telegram/notifications";
import { registerBotCommands } from "@/lib/telegram/register-commands";

export async function GET(request: NextRequest) {
  const env = await getEnv();
  const secret = env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  const expected = `Bearer ${secret}`;
  if (!auth || !timingSafeEqualString(auth, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  void runInBackground(
    registerBotCommands().catch((error) => {
      console.error("registerBotCommands failed:", error);
    }),
  );

  await processEventReminders();
  await processEventDigests();
  return NextResponse.json({ ok: true });
}
