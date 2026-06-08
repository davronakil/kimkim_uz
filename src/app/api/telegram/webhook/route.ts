import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { handleTelegramUpdate } from "@/lib/telegram/handler";
import { registerBotCommands } from "@/lib/telegram/register-commands";
import type { TelegramUpdate } from "@/lib/telegram/types";

export async function POST(request: NextRequest) {
  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!update.message?.from && !update.callback_query?.from) {
    return NextResponse.json({ ok: true });
  }

  try {
    await handleTelegramUpdate(update);
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const setup = request.nextUrl.searchParams.get("setup");
  if (setup === "commands") {
    const auth = request.headers.get("authorization");
    const env = await getEnv();
    const expected = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : null;
    if (!expected || auth !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await registerBotCommands();
      return NextResponse.json({ ok: true, registered: true });
    } catch (error) {
      console.error("Bot command registration failed:", error);
      return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, service: "kimkim-telegram-webhook" });
}
