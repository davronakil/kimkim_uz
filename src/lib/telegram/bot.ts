import { getEnv } from "@/lib/cloudflare";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown";
    reply_markup?: {
      inline_keyboard: Array<Array<{ text: string; url: string }>>;
    };
  },
) {
  const env = await getEnv();
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options,
      }),
    },
  );

  const data = (await response.json()) as TelegramApiResponse<unknown>;
  if (!data.ok) {
    throw new Error(data.description ?? "Telegram sendMessage failed");
  }

  return data;
}

export function parseStartParam(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() ?? null;
}

export function parseJoinInviteCode(startParam: string | null): string | null {
  if (!startParam) return null;
  const match = startParam.match(/^join_(.+)$/i);
  return match?.[1] ?? null;
}

export function buildAppUrl(path: string, appUrl?: string) {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://kimkim.uz").replace(
    /\/$/,
    "",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
