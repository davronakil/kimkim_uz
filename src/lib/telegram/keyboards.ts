import { localeFlags, localeNames, locales } from "@/i18n/config";
import { buildAppUrl } from "@/lib/telegram/bot";
import type { BotLocale } from "@/lib/telegram/types";

export type InlineButton =
  | { text: string; url: string }
  | { text: string; callback_data: string };

export function inviteRsvpKeyboard({
  labels,
  inviteCode,
}: {
  inviteCode: string;
  labels: {
    going: string;
    declined: string;
    openEvent: string;
    eventUrl: string;
  };
}) {
  return {
    inline_keyboard: [
      [
        { text: labels.going, callback_data: `rsvp:y:${inviteCode}` },
        { text: labels.declined, callback_data: `rsvp:n:${inviteCode}` },
      ],
      [{ text: labels.openEvent, url: labels.eventUrl }],
    ],
  };
}

export function expenseEventPickerKeyboard(
  events: Array<{ id: string; title: string }>,
  locale: BotLocale,
) {
  return {
    inline_keyboard: events.slice(0, 6).map((event) => [
      {
        text: event.title.slice(0, 40),
        callback_data: `exp:${event.id}`,
      },
    ]),
  };
}

export function buildEventOpenUrl(eventId: string, locale: BotLocale) {
  return buildAppUrl(`/${locale}/events/${eventId}`);
}

export function languagePickerKeyboard() {
  const rows: InlineButton[][] = [];
  for (let i = 0; i < locales.length; i += 2) {
    rows.push(
      locales.slice(i, i + 2).map((code) => ({
        text: `${localeFlags[code]} ${localeNames[code]}`,
        callback_data: `lang:${code}`,
      })),
    );
  }
  return { inline_keyboard: rows };
}
