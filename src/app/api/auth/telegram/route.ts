import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramWebAppInitData } from "@/lib/auth/telegram";
import {
  applySessionCookie,
  createSession,
  upsertTelegramUser,
} from "@/lib/auth/session";
import { getEnv } from "@/lib/cloudflare";
import { resolveLocaleFromTelegramCode } from "@/lib/locale";

function isSecureRequest(request: NextRequest) {
  return (
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https"
  );
}

/** Mini App auto-login via initData. Web sign-in uses Continue in Telegram challenges. */
export async function PUT(request: NextRequest) {
  const env = await getEnv();
  const body = (await request.json()) as { initData?: string };
  const initData = body.initData;

  if (!initData || typeof initData !== "string") {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 });
  }

  const data = verifyTelegramWebAppInitData(initData, env.TELEGRAM_BOT_TOKEN);
  if (!data?.user) {
    return NextResponse.json({ error: "Invalid initData" }, { status: 401 });
  }

  const telegramUser = JSON.parse(data.user) as {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    language_code?: string;
  };

  const user = await upsertTelegramUser({
    telegram_id: String(telegramUser.id),
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name,
    username: telegramUser.username,
    photo_url: telegramUser.photo_url,
    language_code: telegramUser.language_code,
    appLocale: resolveLocaleFromTelegramCode(telegramUser.language_code),
  });

  const token = await createSession(user.id);
  const response = NextResponse.json({ user });
  return applySessionCookie(response, token, isSecureRequest(request));
}
