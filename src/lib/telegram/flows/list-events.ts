import { listUserEvents } from "@/lib/db/queries";
import { buildAppUrl, sendTelegramMessage } from "@/lib/telegram/bot";
import { formatEventWhen, t } from "@/lib/telegram/i18n";
import type { BotLocale } from "@/lib/telegram/types";
import type { User } from "@/types";

export async function sendUserEvents(chatId: number, user: User, locale: BotLocale) {
  const strings = t(locale);
  const events = await listUserEvents(user.id);
  const now = Date.now();
  const upcoming = events
    .filter((event) => new Date(event.starts_at).getTime() >= now)
    .slice(0, 5);

  if (upcoming.length === 0) {
    await sendTelegramMessage(chatId, strings.noEvents, {
      reply_markup: {
        inline_keyboard: [
          [{ text: strings.createEventBtn, url: buildAppUrl(`/${locale}/events/new`) }],
        ],
      },
    });
    return;
  }

  const lines = upcoming.map((event) =>
    strings.eventLine(event.title, formatEventWhen(event.starts_at, locale)),
  );

  const remaining = events.filter((event) => new Date(event.starts_at).getTime() >= now).length - upcoming.length;
  if (remaining > 0) {
    lines.push(strings.moreEvents(remaining));
  }

  const keyboard = upcoming.slice(0, 3).map((event) => [
    {
      text: event.title.slice(0, 40),
      url: buildAppUrl(`/${locale}/events/${event.id}`),
    },
  ]);

  keyboard.push([{ text: strings.openApp, url: buildAppUrl(`/${locale}/events`) }]);

  await sendTelegramMessage(chatId, `${strings.eventsHeader}\n\n${lines.join("\n")}`, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
}
