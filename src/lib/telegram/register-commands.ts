import { getEnv } from "@/lib/cloudflare";

type TelegramApiResponse = {
  ok: boolean;
  description?: string;
};

const commandSets = {
  en: [
    { command: "create", description: "Create a new event" },
    { command: "expense", description: "Log an expense quickly" },
    { command: "events", description: "Your upcoming events" },
    { command: "album", description: "Add or save event photos" },
    { command: "help", description: "How to use the bot" },
    { command: "cancel", description: "Cancel current action" },
    { command: "lang", description: "Switch language (en / uz / ru)" },
  ],
  uz: [
    { command: "create", description: "Yangi event yaratish" },
    { command: "expense", description: "Xarajat qo'shish" },
    { command: "events", description: "Yaqin eventlar" },
    { command: "album", description: "Event rasmlarini qo'shish" },
    { command: "help", description: "Bot qo'llanmasi" },
    { command: "cancel", description: "Bekor qilish" },
    { command: "lang", description: "Tilni o'zgartirish (uz / en / ru)" },
  ],
  ru: [
    { command: "create", description: "Создать событие" },
    { command: "expense", description: "Записать расход" },
    { command: "events", description: "Ближайшие события" },
    { command: "album", description: "Фото события" },
    { command: "help", description: "Справка по боту" },
    { command: "cancel", description: "Отменить действие" },
    { command: "lang", description: "Сменить язык (ru / en / uz)" },
  ],
} as const;

const groupCommandSets = {
  en: [
    { command: "link", description: "Link this group or topic to an event" },
    { command: "unlink", description: "Disconnect group from event" },
    { command: "event", description: "Show linked event" },
    { command: "album", description: "Shared photo album" },
  ],
  uz: [
    { command: "link", description: "Guruh yoki mavzuni eventga ulash" },
    { command: "unlink", description: "Guruhni uzish" },
    { command: "event", description: "Ulangan event" },
    { command: "album", description: "Umumiy fotoalbom" },
  ],
  ru: [
    { command: "link", description: "Привязать группу или тему к событию" },
    { command: "unlink", description: "Отвязать группу" },
    { command: "event", description: "Показать событие" },
    { command: "album", description: "Общий фотоальбом" },
  ],
} as const;

async function setCommands(
  token: string,
  commands: ReadonlyArray<{ command: string; description: string }>,
  options?: { language_code?: string; scope?: { type: string } },
) {
  const response = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands, ...options }),
  });

  const data = (await response.json()) as TelegramApiResponse;
  if (!data.ok) {
    throw new Error(data.description ?? "setMyCommands failed");
  }
}

export async function registerBotCommands() {
  const env = await getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;

  for (const [languageCode, commands] of Object.entries(commandSets)) {
    await setCommands(token, commands, { language_code: languageCode });
  }

  for (const [languageCode, commands] of Object.entries(groupCommandSets)) {
    await setCommands(token, commands, {
      language_code: languageCode,
      scope: { type: "all_group_chats" },
    });
  }
}
