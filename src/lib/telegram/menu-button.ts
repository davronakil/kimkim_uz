import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getEnv } from "@/lib/cloudflare";

type TelegramApiResponse<T = unknown> = {
  ok: boolean;
  result?: T;
  description?: string;
};

/**
 * BotFather / setChatMenuButton can pin a Mini App on the chat input row
 * (e.g. "Events · KimKim"). On iOS, Start / login deep-links often warm that
 * webview in parallel with the first bot reply — the pair that freezes until
 * force-quit. Chat-first URL buttons remain the entry; commands menu does not
 * auto-open a WebApp.
 */
export type TelegramMenuButton =
  | { type: "commands" }
  | { type: "default" }
  | { type: "web_app"; text: string; web_app: { url: string } };

async function telegramCall<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<TelegramApiResponse<T>> {
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return (await response.json()) as TelegramApiResponse<T>;
}

export async function getDefaultChatMenuButton(token: string): Promise<TelegramMenuButton | null> {
  const data = await telegramCall<TelegramMenuButton>(token, "getChatMenuButton");
  return data.ok ? (data.result ?? null) : null;
}

export async function setDefaultChatMenuButtonCommands(token: string): Promise<void> {
  const data = await telegramCall(token, "setChatMenuButton", {
    menu_button: { type: "commands" },
  });
  if (!data.ok) {
    throw new Error(data.description ?? "setChatMenuButton failed");
  }
}

/**
 * Clear a default Web App menu button. Idempotent: only writes when Telegram
 * currently reports `web_app` (or when `force` is set).
 */
export async function ensureCommandsMenuButton(options?: { force?: boolean }) {
  const env = await getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const force = options?.force === true;

  if (!force) {
    const current = await getDefaultChatMenuButton(token);
    if (current && current.type !== "web_app") {
      return { written: false as const, previous: current.type };
    }
    if (!current) {
      // Failed read — still try to clear; a no-op commands write is cheap vs a
      // stuck Mini App bar on Start.
      await setDefaultChatMenuButtonCommands(token);
      return { written: true as const, previous: "unknown" as const };
    }
  }

  await setDefaultChatMenuButtonCommands(token);
  return { written: true as const, previous: "web_app" as const };
}
