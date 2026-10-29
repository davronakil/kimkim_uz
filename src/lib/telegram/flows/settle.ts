import { getEventById, listEventMembers } from "@/lib/db/queries";
import { markSettlementPaid, undoSettlementPayment } from "@/lib/expense/settle-up";
import {
  answerCallbackQuery,
  editMessageReplyMarkup,
  sendTelegramMessage,
} from "@/lib/telegram/bot";
import { t } from "@/lib/telegram/i18n";
import type { InlineButton } from "@/lib/telegram/keyboards";
import {
  parseMarkPaidCallbackData,
  parseUndoPaymentCallbackData,
  undoPaymentCallbackData,
} from "@/lib/telegram/settle-callback-data";
import type { BotLocale, TelegramCallbackQuery } from "@/lib/telegram/types";
import type { User } from "@/types";
import { displayName, formatMoney } from "@/lib/utils";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Drop the tapped button so a settled line can't be tapped again. */
async function removeTappedButton(query: TelegramCallbackQuery) {
  const message = query.message;
  const rows = message?.reply_markup?.inline_keyboard;
  if (!message || !rows) return;
  const remaining = rows
    .map((row) => row.filter((button) => button.callback_data !== query.data))
    .filter((row) => row.length > 0) as InlineButton[][];
  await editMessageReplyMarkup(message.chat.id, message.message_id, {
    inline_keyboard: remaining,
  }).catch(() => undefined);
}

export async function handleSettleCallback(
  query: TelegramCallbackQuery,
  user: User,
  locale: BotLocale,
): Promise<boolean> {
  const data = query.data ?? "";
  const strings = t(locale);

  const mark = parseMarkPaidCallbackData(data);
  if (mark) {
    const event = await getEventById(mark.eventId);
    if (!event) {
      await answerCallbackQuery(query.id, strings.settleNothingOwed, true);
      return true;
    }
    const result = await markSettlementPaid({
      event,
      actorId: user.id,
      counterpartId: mark.counterpartId,
      currency: mark.currency,
    });
    await removeTappedButton(query);
    if (!result.ok) {
      await answerCallbackQuery(query.id, strings.settleNothingOwed, true);
      return true;
    }

    const payment = result.value;
    const members = await listEventMembers(event.id);
    const counterpart = members.find((member) => member.id === mark.counterpartId);
    const name = escapeHtml(counterpart ? displayName(counterpart) : "?");
    const amount = formatMoney(payment.amount_cents, payment.currency, locale);
    const title = escapeHtml(event.title);
    await answerCallbackQuery(query.id);
    if (query.message) {
      await sendTelegramMessage(
        query.message.chat.id,
        payment.from_user_id === user.id
          ? strings.settleMarkedPaid(name, amount, title)
          : strings.settleMarkedReceived(name, amount, title),
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: strings.settleUndoBtn,
                  callback_data: undoPaymentCallbackData(event.id, payment.id),
                },
              ],
            ],
          },
        },
      );
    }
    return true;
  }

  const undo = parseUndoPaymentCallbackData(data);
  if (undo) {
    const result = await undoSettlementPayment({
      eventId: undo.eventId,
      actorId: user.id,
      paymentId: undo.paymentId,
    });
    if (!result.ok && result.error === "forbidden") {
      await answerCallbackQuery(query.id, strings.settleNotAllowed, true);
      return true;
    }
    await removeTappedButton(query);
    await answerCallbackQuery(
      query.id,
      result.ok ? strings.settleUndone : strings.settleAlreadyUndone,
      !result.ok,
    );
    return true;
  }

  return false;
}
