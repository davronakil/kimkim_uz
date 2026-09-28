import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildLoginTelegramUrl,
  createLoginChallenge,
  getLoginChallenge,
  loginChallengeStatus,
} from "@/lib/auth/login-challenge";
import { getEnv } from "@/lib/cloudflare";
import { isLocale } from "@/lib/locale";

const createSchema = z.object({
  redirect_to: z.string().max(512).optional().nullable(),
  locale: z.string().max(8).optional().nullable(),
});

function botUsernameFromEnv(env: Awaited<ReturnType<typeof getEnv>>): string {
  return (
    env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    env.TELEGRAM_BOT_USERNAME ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    process.env.TELEGRAM_BOT_USERNAME ||
    ""
  );
}

export async function POST(request: NextRequest) {
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const env = await getEnv();
  const botUsername = botUsernameFromEnv(env).replace(/^@/, "");
  if (!botUsername || botUsername === "your_bot_username") {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 503 });
  }

  const locale =
    parsed.data.locale && isLocale(parsed.data.locale) ? parsed.data.locale : "uz";

  const challenge = await createLoginChallenge({
    redirectTo: parsed.data.redirect_to,
    locale,
  });

  return NextResponse.json({
    id: challenge.id,
    telegramUrl: buildLoginTelegramUrl(botUsername, challenge.id),
    expiresAt: challenge.expires_at,
  });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const challenge = await getLoginChallenge(id);
  return NextResponse.json({
    status: loginChallengeStatus(challenge),
  });
}
