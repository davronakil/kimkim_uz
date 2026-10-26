import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { timingSafeEqualString } from "@/lib/security/timing-safe";
import { handleTelegramUpdate } from "@/lib/telegram/handler";
import { registerBotCommands } from "@/lib/telegram/register-commands";
import type { TelegramUpdate } from "@/lib/telegram/types";

const SLOW_UPDATE_MS = 3000;
const SECRET_HEADER = "x-telegram-bot-api-secret-token";

function describeUpdate(update: TelegramUpdate) {
  if (update.callback_query) return "callback_query";
  const text = update.message?.text?.trim() ?? "";
  if (text.startsWith("/")) return text.split(/\s+/)[0].slice(0, 32);
  return "message";
}

function authorizeWebhook(request: NextRequest, secret: string | undefined) {
  if (!secret) return false;
  const provided = request.headers.get(SECRET_HEADER);
  if (!provided) return false;
  return timingSafeEqualString(provided, secret);
}

export async function POST(request: NextRequest) {
  const env = await getEnv();
  if (!authorizeWebhook(request, env.TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!update.message?.from && !update.callback_query?.from) {
    return NextResponse.json({ ok: true });
  }

  const startedAt = Date.now();
  try {
    await handleTelegramUpdate(update);
  } catch (error) {
    console.error("Telegram webhook error:", { updateId: update.update_id, error });
    // A plain /start only resets the flow and sends a greeting, so Telegram can
    // safely retry it. Other updates may create expenses or send album media.
    if (
      update.message?.chat.type === "private" &&
      /^\/start(?:@\w+)?$/i.test(update.message.text?.trim() ?? "")
    ) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
  }

  // Telegram re-delivers an update it considers unanswered, which reaches the
  // user as duplicate bot replies. Flag updates that get close to that window.
  const elapsed = Date.now() - startedAt;
  if (elapsed > SLOW_UPDATE_MS) {
    console.warn(
      `Telegram webhook slow: ${elapsed}ms for ${describeUpdate(update)} (update ${update.update_id})`,
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const setup = request.nextUrl.searchParams.get("setup");
  if (setup === "commands") {
    const auth = request.headers.get("authorization");
    const env = await getEnv();
    const expected = env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : null;
    if (!expected || !auth || !timingSafeEqualString(auth, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const force = request.nextUrl.searchParams.get("force") === "1";

    try {
      const { written, menuButton } = await registerBotCommands({ force });
      return NextResponse.json({ ok: true, registered: true, written, menuButton });
    } catch (error) {
      console.error("Bot command registration failed:", error);
      return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, service: "kimkim-telegram-webhook" });
}
