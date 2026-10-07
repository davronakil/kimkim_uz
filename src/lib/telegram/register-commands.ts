import { getEnv } from "@/lib/cloudflare";

type BotCommand = { command: string; description: string };

type TelegramApiResponse<T = unknown> = {
  ok: boolean;
  result?: T;
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

type CommandScope = { language_code?: string; scope?: { type: string } };

async function setCommands(
  token: string,
  commands: ReadonlyArray<BotCommand>,
  options?: CommandScope,
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

async function getCommands(token: string, options?: CommandScope) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...options }),
  });

  const data = (await response.json()) as TelegramApiResponse<BotCommand[]>;
  return data.ok ? (data.result ?? []) : null;
}

function sameCommands(a: ReadonlyArray<BotCommand>, b: ReadonlyArray<BotCommand>) {
  return (
    a.length === b.length &&
    a.every(
      (entry, index) =>
        entry.command === b[index]?.command && entry.description === b[index]?.description,
    )
  );
}

/**
 * Every successful setMyCommands invalidates the bot's cached info on every
 * client, so only write when the list actually changed. `force` skips the
 * comparison for the manual refresh.
 */
export async function registerBotCommands(options?: { force?: boolean }) {
  const env = await getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const force = options?.force === true;
  let written = 0;

  const scoped: Array<{ commands: ReadonlyArray<BotCommand>; scope: CommandScope }> = [
    ...Object.entries(commandSets).map(([language_code, commands]) => ({
      commands,
      scope: { language_code } satisfies CommandScope,
    })),
    ...Object.entries(groupCommandSets).map(([language_code, commands]) => ({
      commands,
      scope: { language_code, scope: { type: "all_group_chats" } } satisfies CommandScope,
    })),
  ];

  for (const { commands, scope } of scoped) {
    if (!force) {
      const current = await getCommands(token, scope);
      if (current && sameCommands(commands, current)) continue;
    }
    await setCommands(token, commands, scope);
    written += 1;
  }

  return { written };
}
