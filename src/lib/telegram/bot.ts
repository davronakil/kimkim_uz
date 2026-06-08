import { getEnv } from "@/lib/cloudflare";
import type { InlineButton } from "@/lib/telegram/keyboards";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramReplyMarkup = {
  inline_keyboard: InlineButton[][];
};

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown";
    reply_markup?: TelegramReplyMarkup;
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

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false,
) {
  const env = await getEnv();
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  });
}

export async function editMessageReplyMarkup(
  chatId: number,
  messageId: number,
  replyMarkup?: TelegramReplyMarkup,
) {
  const env = await getEnv();
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup ?? { inline_keyboard: [] },
    }),
  });
}

export function parseStartParam(text: string | undefined): string | null {
  if (!text) return null;
  const match = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() ?? null;
}

export { parseJoinStartParam } from "@/lib/telegram/locale";

export function buildAppUrl(path: string, appUrl?: string) {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://kimkim.uz").replace(
    /\/$/,
    "",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
