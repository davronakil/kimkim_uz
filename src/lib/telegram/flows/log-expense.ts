import { runInBackground } from "@/lib/cloudflare";
import { createExpenseRecord } from "@/lib/expense/create";
import {
  getEventById,
  isEventMember,
  listEventMembers,
  listUserEvents,
} from "@/lib/db/queries";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { expenseEventPickerKeyboard, buildEventOpenUrl } from "@/lib/telegram/keyboards";
import { t } from "@/lib/telegram/i18n";
import { parseQuickExpense } from "@/lib/telegram/parse-expense";
import {
  clearBotSession,
  readExpenseSessionData,
  upsertBotSession,
} from "@/lib/telegram/sessions";
import { notifyNewExpense } from "@/lib/telegram/notifications";
import type { BotLocale, BotSession } from "@/lib/telegram/types";
import type { User } from "@/types";
import { formatMoney } from "@/lib/utils";

function upcomingEvents(userId: string) {
  return listUserEvents(userId).then((events) => {
    const now = Date.now();
    return events.filter((event) => new Date(event.starts_at).getTime() >= now);
  });
}

export async function startLogExpenseFlow(chatId: number, user: User, locale: BotLocale) {
  const events = await upcomingEvents(user.id);
  const memberEvents = (
    await Promise.all(
      events.map(async (event) => ((await isEventMember(event.id, user.id)) ? event : null)),
    )
  ).filter(Boolean);

  if (memberEvents.length === 0) {
    await sendTelegramMessage(chatId, t(locale).expenseNoEvents);
    return;
  }

  if (memberEvents.length === 1) {
    await startLogExpenseForEvent(chatId, user, locale, memberEvents[0]!.id);
    return;
  }

  await sendTelegramMessage(chatId, t(locale).expensePickEvent, {
    reply_markup: expenseEventPickerKeyboard(
      memberEvents.map((event) => ({ id: event!.id, title: event!.title })),
    ),
  });
}

export async function startLogExpenseForEvent(
  chatId: number,
  user: User,
  locale: BotLocale,
  eventId: string,
) {
  const event = await getEventById(eventId);
  if (!event) return;

  await upsertBotSession({
    chatId,
    userId: user.id,
    flow: "log_expense",
    step: "amount_description",
    data: { eventId },
    locale,
  });

  await sendTelegramMessage(chatId, t(locale).expenseAskAmount(event.title), {
    parse_mode: "HTML",
  });
}

export async function handleLogExpenseStep(
  chatId: number,
  user: User,
  session: BotSession,
  text: string,
) {
  const locale = session.locale;
  const strings = t(locale);
  const data = readExpenseSessionData(session);
  const eventId = data.eventId;

  if (!eventId || session.step !== "amount_description") {
    await clearBotSession(chatId);
    await sendTelegramMessage(chatId, strings.unknown);
    return;
  }

  const parsed = parseQuickExpense(text);
  if (!parsed) {
    await sendTelegramMessage(chatId, strings.expenseInvalidFormat);
    return;
  }

  const members = await listEventMembers(eventId);
  if (members.length === 0) {
    await clearBotSession(chatId);
    await sendTelegramMessage(chatId, strings.expenseNoMembers);
    return;
  }

  const { amountCents, currency } = await createExpenseRecord({
    eventId,
    payerId: user.id,
    description: parsed.description,
    amount: parsed.amount,
    currency: "UZS",
    splitUserIds: members.map((member) => member.id),
  });

  await clearBotSession(chatId);

  const event = await getEventById(eventId);
  const amountLabel = formatMoney(amountCents, currency, locale);

  void runInBackground(
    notifyNewExpense({
      eventId,
      author: user,
      description: parsed.description,
      amountLabel,
      authorUserId: user.id,
    }),
  );

  await sendTelegramMessage(
    chatId,
    strings.expenseLogged(parsed.description, amountLabel, event?.title ?? "Event"),
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: strings.openEvent, url: buildEventOpenUrl(eventId, locale) }]],
      },
    },
  );
}
