import {
  listPaymentMethodsForUsers,
  listUserEvents,
  listUserPaymentMethods,
} from "@/lib/db/queries";
import { loadEventSettlements } from "@/lib/events/workspace-data";
import {
  PAYMENT_METHODS_CURRENCY,
  cashAppPayUrl,
  displayPaymentValue,
  venmoPayUrl,
  type PaymentMethod,
} from "@/lib/payments/methods";
import { buildAppUrl, sendTelegramMessage } from "@/lib/telegram/bot";
import { t } from "@/lib/telegram/i18n";
import { markPaidCallbackData } from "@/lib/telegram/settle-callback-data";
import type { InlineButton } from "@/lib/telegram/keyboards";
import type { BotLocale } from "@/lib/telegram/types";
import type { EventMember, Settlement, User } from "@/types";
import { displayName, formatMoney } from "@/lib/utils";

const MAX_EVENTS = 8;
const MAX_PAY_BUTTONS = 12;
const MAX_MARK_BUTTONS = 20;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type EventBalances = {
  eventId: string;
  title: string;
  members: EventMember[];
  owes: Settlement[];
  owed: Settlement[];
};

export async function sendUserBalances(chatId: number, user: User, locale: BotLocale) {
  const strings = t(locale);
  const events = (await listUserEvents(user.id))
    .filter((event) => event.expenses_enabled)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  const balances: EventBalances[] = [];
  for (const event of events) {
    if (balances.length >= MAX_EVENTS) break;
    const { members, settlements } = await loadEventSettlements(event.id);
    const owes = settlements.filter((settlement) => settlement.from_user_id === user.id);
    const owed = settlements.filter((settlement) => settlement.to_user_id === user.id);
    if (owes.length === 0 && owed.length === 0) continue;
    balances.push({ eventId: event.id, title: event.title, members, owes, owed });
  }

  if (balances.length === 0) {
    await sendTelegramMessage(chatId, strings.balanceEmpty);
    return;
  }

  const payeeIds = balances.flatMap((entry) =>
    entry.owes
      .filter((settlement) => settlement.currency === PAYMENT_METHODS_CURRENCY)
      .map((settlement) => settlement.to_user_id),
  );
  const [methodsByUser, ownMethods] = await Promise.all([
    listPaymentMethodsForUsers(payeeIds),
    listUserPaymentMethods(user.id),
  ]);

  const sections: string[] = [];
  const payButtons: InlineButton[][] = [];
  const markButtons: InlineButton[][] = [];
  const addMarkButton = (eventId: string, counterpartId: string, currency: string, text: string) => {
    if (markButtons.length >= MAX_MARK_BUTTONS) return;
    markButtons.push([
      { text, callback_data: markPaidCallbackData(eventId, counterpartId, currency) },
    ]);
  };
  let owedInUsd = false;

  for (const entry of balances) {
    const plainNameOf = (userId: string) => {
      const member = entry.members.find((item) => item.id === userId);
      return member ? displayName(member) : "?";
    };
    const nameOf = (userId: string) => escapeHtml(plainNameOf(userId));
    const lines = [`<b>${escapeHtml(entry.title)}</b>`];
    const note = `${entry.title} · KimKim`;

    for (const settlement of entry.owes) {
      const name = nameOf(settlement.to_user_id);
      const amount = formatMoney(settlement.amount_cents, settlement.currency, locale);
      lines.push(strings.balanceYouOwe(name, amount));
      addMarkButton(
        entry.eventId,
        settlement.to_user_id,
        settlement.currency,
        strings.balanceMarkPaidBtn(plainNameOf(settlement.to_user_id), amount),
      );
      if (settlement.currency !== PAYMENT_METHODS_CURRENCY) continue;

      const methods: PaymentMethod[] = methodsByUser[settlement.to_user_id] ?? [];
      if (methods.length === 0) {
        lines.push(strings.balanceNoMethods(name));
        continue;
      }
      for (const method of methods) {
        if (method.kind === "zelle") {
          lines.push(strings.balanceMethodLine("Zelle", escapeHtml(displayPaymentValue(method))));
        } else if (method.kind === "apple_cash") {
          lines.push(
            strings.balanceMethodLine("Apple Cash", escapeHtml(displayPaymentValue(method))),
          );
          lines.push(strings.balanceAppleCashHint(amount));
        } else if (payButtons.length < MAX_PAY_BUTTONS) {
          const label = method.kind === "venmo" ? "Venmo" : "Cash App";
          const url =
            method.kind === "venmo"
              ? venmoPayUrl(method.value, settlement.amount_cents, note)
              : cashAppPayUrl(method.value, settlement.amount_cents);
          payButtons.push([
            { text: strings.balancePayButton(label, plainNameOf(settlement.to_user_id), amount), url },
          ]);
        }
      }
    }

    for (const settlement of entry.owed) {
      if (settlement.currency === PAYMENT_METHODS_CURRENCY) owedInUsd = true;
      const amount = formatMoney(settlement.amount_cents, settlement.currency, locale);
      lines.push(strings.balanceOwesYou(nameOf(settlement.from_user_id), amount));
      addMarkButton(
        entry.eventId,
        settlement.from_user_id,
        settlement.currency,
        strings.balanceMarkReceivedBtn(plainNameOf(settlement.from_user_id), amount),
      );
    }

    sections.push(lines.join("\n"));
  }

  if (owedInUsd && ownMethods.length === 0) {
    sections.push(strings.balanceAddYours);
  }

  const keyboard: InlineButton[][] = [...payButtons, ...markButtons];
  if (balances.length === 1) {
    keyboard.push([
      { text: strings.openEvent, url: buildAppUrl(`/${locale}/events/${balances[0]!.eventId}`) },
    ]);
  }
  if (owedInUsd && ownMethods.length === 0) {
    keyboard.push([{ text: strings.balanceProfileBtn, url: buildAppUrl(`/${locale}/profile`) }]);
  }

  await sendTelegramMessage(chatId, `${strings.balanceHeader}\n\n${sections.join("\n\n")}`, {
    parse_mode: "HTML",
    reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
  });
}
