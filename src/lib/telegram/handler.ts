import { upsertTelegramUser } from "@/lib/auth/session";
import { getEventByInviteCode } from "@/lib/db/queries";
import {
  buildAppUrl,
  parseStartParam,
  sendTelegramMessage,
} from "@/lib/telegram/bot";
import { handleCallbackQuery } from "@/lib/telegram/callbacks";
import { handleCreateEventStep, startCreateEventFlow } from "@/lib/telegram/flows/create-event";
import {
  handleLogExpenseStep,
  startLogExpenseFlow,
} from "@/lib/telegram/flows/log-expense";
import { handleGroupMessage } from "@/lib/telegram/flows/group-messages";
import { sendUserEvents } from "@/lib/telegram/flows/list-events";
import { isGroupChatType } from "@/lib/telegram/group";
import { inviteRsvpKeyboard, languagePickerKeyboard } from "@/lib/telegram/keyboards";
import { t } from "@/lib/telegram/i18n";
import { parseIntent } from "@/lib/telegram/intents";
import {
  parseJoinStartParam,
  parseLangCommand,
  resolveBotLocale,
} from "@/lib/telegram/locale";
import { clearBotSession, getBotSession, upsertBotSession } from "@/lib/telegram/sessions";
import type { BotLocale, BotSessionFlow, TelegramMessage, TelegramUpdate } from "@/lib/telegram/types";
import { linkTelegramChat } from "@/lib/telegram/chat";
import { registerBotCommands } from "@/lib/telegram/register-commands";
import type { User } from "@/types";

async function sendWelcome(chatId: number, locale: BotLocale) {
  void registerBotCommands().catch((error) => {
    console.error("registerBotCommands failed:", error);
  });

  const strings = t(locale);
  await sendTelegramMessage(chatId, strings.welcome, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: strings.createEventBtn,
            url: buildAppUrl(`/${locale}/events/new`),
          },
          { text: strings.openApp, url: buildAppUrl(`/${locale}`) },
        ],
        [{ text: `🌐 ${strings.chooseLanguage}`, callback_data: "lang:pick" }],
      ],
    },
  });
}

async function handleInviteStart(
  message: TelegramMessage,
  user: User,
  inviteCode: string,
  localeFromLink?: BotLocale,
) {
  const locale = localeFromLink ?? resolveBotLocale(message.from, user);

  const event = await getEventByInviteCode(inviteCode);
  const strings = t(locale);

  if (!event) {
    await sendTelegramMessage(message.chat.id, strings.inviteNotFound);
    return;
  }

  const eventUrl = buildAppUrl(`/${locale}/events/${event.id}`);
  await sendTelegramMessage(message.chat.id, strings.welcomeInvite(event.title), {
    parse_mode: "HTML",
    reply_markup: inviteRsvpKeyboard({
      inviteCode,
      labels: {
        going: strings.rsvpGoing,
        declined: strings.rsvpDeclined,
        openEvent: strings.openEvent,
        eventUrl,
      },
    }),
  });
}

async function handlePrivateMessage(message: TelegramMessage) {
  if (!message.from) return;

  const text = message.text?.trim() ?? "";
  const hasLocation = Boolean(message.location || message.venue);

  let user = await upsertTelegramUser({
    telegram_id: String(message.from.id),
    first_name: message.from.first_name,
    last_name: message.from.last_name ?? null,
    username: message.from.username ?? null,
    language_code: message.from.language_code ?? null,
  });

  await linkTelegramChat(message.from, message.chat.id);

  if (text) {
    const startParam = parseStartParam(text);
    const join = parseJoinStartParam(startParam);
    if (join) {
      if (join.locale) {
        user = await upsertTelegramUser({
          telegram_id: String(message.from.id),
          first_name: message.from.first_name,
          last_name: message.from.last_name ?? null,
          username: message.from.username ?? null,
          appLocale: join.locale,
        });
      }
      await handleInviteStart(message, user, join.inviteCode, join.locale);
      return;
    }
  }

  let locale = resolveBotLocale(message.from, user);
  const session = await getBotSession(message.chat.id);
  if (session?.locale) {
    locale = session.locale;
  }

  const intent = text ? parseIntent(text) : { type: "text" as const };
  const strings = t(locale);

  if (text) {
    const langChoice = parseLangCommand(text);
    if (langChoice) {
      user = await upsertTelegramUser({
        telegram_id: String(message.from.id),
        first_name: message.from.first_name,
        last_name: message.from.last_name ?? null,
        username: message.from.username ?? null,
        appLocale: langChoice,
      });
      if (session) {
        await upsertBotSession({
          chatId: message.chat.id,
          userId: user.id,
          flow: session.flow as BotSessionFlow | null,
          step: session.step,
          data: JSON.parse(session.data || "{}"),
          locale: langChoice,
        });
      }
      await sendTelegramMessage(message.chat.id, t(langChoice).langSet(langChoice));
      return;
    }

    if (intent.type === "command" && intent.name === "lang") {
      await sendTelegramMessage(message.chat.id, strings.langUsage, {
        reply_markup: languagePickerKeyboard(),
      });
      return;
    }

    if (intent.type === "command" && intent.name === "cancel") {
      await clearBotSession(message.chat.id);
      await sendTelegramMessage(message.chat.id, strings.cancelled);
      return;
    }
  }

  if (session?.flow === "create_event") {
    const onLocationStep = session.step === "location";
    if (text || (onLocationStep && hasLocation)) {
      await handleCreateEventStep(message.chat.id, user, session, text, message);
      return;
    }
    if (text || intent.type === "command") {
      await clearBotSession(message.chat.id);
    }
  }

  if (session?.flow === "log_expense") {
    if (intent.type === "text" && text) {
      await handleLogExpenseStep(message.chat.id, user, session, text);
      return;
    }
    await clearBotSession(message.chat.id);
  }

  if (!text) return;

  if (intent.type === "command" && intent.name === "help") {
    await sendTelegramMessage(message.chat.id, strings.help, { parse_mode: "HTML" });
    return;
  }

  if (
    (intent.type === "command" && intent.name === "create") ||
    (intent.type === "natural" && intent.name === "create")
  ) {
    await startCreateEventFlow(message.chat.id, user, locale);
    return;
  }

  if (
    (intent.type === "command" && intent.name === "expense") ||
    (intent.type === "natural" && intent.name === "expense")
  ) {
    await startLogExpenseFlow(message.chat.id, user, locale);
    return;
  }

  if (
    (intent.type === "command" && intent.name === "events") ||
    (intent.type === "natural" && intent.name === "events")
  ) {
    await sendUserEvents(message.chat.id, user, locale);
    return;
  }

  if (intent.type === "command" && intent.name === "start") {
    await sendWelcome(message.chat.id, locale);
    return;
  }

  if (intent.type === "text") {
    await sendTelegramMessage(message.chat.id, strings.unknown);
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message?.from) return;

  if (isGroupChatType(message.chat.type)) {
    await handleGroupMessage(message);
    return;
  }

  const hasContent =
    Boolean(message.text) || Boolean(message.location) || Boolean(message.venue);
  if (!hasContent) return;

  await handlePrivateMessage(message);
}
