"use client";

import { Banknote, CircleDollarSign, Gift, Receipt, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  areExpensesEnabledByDefault,
  defaultPaymentMode,
  eventPaymentModes,
  type EventPaymentMode,
} from "@/lib/events/payment-mode";
import { eventCurrencies } from "@/lib/events/form";
import { centsToMajor } from "@/lib/utils";

const modeIcons: Record<EventPaymentMode, typeof Gift> = {
  free: Gift,
  split: Users,
  pay_yourself: CircleDollarSign,
  paid: Banknote,
};

export function PaymentModePicker({
  defaultValue = defaultPaymentMode,
  defaultExpensesEnabled,
  defaultExpenseCurrency = "UZS",
  defaultTicketPriceCents,
  defaultTicketCurrency = "UZS",
}: {
  defaultValue?: EventPaymentMode;
  defaultExpensesEnabled?: boolean;
  defaultExpenseCurrency?: string;
  defaultTicketPriceCents?: number | null;
  defaultTicketCurrency?: string;
}) {
  const t = useTranslations("events.paymentMode");
  const [selected, setSelected] = useState<EventPaymentMode>(defaultValue);
  const [expensesEnabled, setExpensesEnabled] = useState(
    defaultExpensesEnabled ?? areExpensesEnabledByDefault(defaultValue),
  );
  const [expensesTouched, setExpensesTouched] = useState(false);
  const defaultPrice =
    defaultTicketPriceCents && defaultTicketPriceCents > 0
      ? String(centsToMajor(defaultTicketPriceCents))
      : "";

  return (
    <div className="space-y-3">
      <input type="hidden" name="payment_mode" value={selected} />
      <p className="kk-label">{t("fieldLabel")}</p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {eventPaymentModes.map((mode) => {
          const Icon = modeIcons[mode];
          const active = selected === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setSelected(mode);
                if (!expensesTouched) {
                  setExpensesEnabled(areExpensesEnabledByDefault(mode));
                }
              }}
              className={`flex min-h-[5.5rem] touch-manipulation flex-col items-start gap-2 rounded-2xl border p-3 text-left transition active:scale-[0.98] sm:min-h-24 sm:p-4 ${
                active
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30 dark:border-emerald-600 dark:bg-emerald-950/50"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}
              />
              <span className="text-sm font-semibold leading-tight">{t(`labels.${mode}`)}</span>
              <span className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                {t(`short.${mode}`)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <input type="hidden" name="expenses_enabled" value={String(expensesEnabled)} />
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 dark:bg-zinc-900 dark:text-emerald-300">
          <Receipt className="h-5 w-5" />
        </span>
        <label htmlFor="expenses_enabled_toggle" className="space-y-1">
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {t("expensesToggle")}
          </span>
          <span className="block text-sm text-zinc-500 dark:text-zinc-400">
            {t("expensesToggleHint")}
          </span>
        </label>
        <button
          id="expenses_enabled_toggle"
          type="button"
          role="switch"
          aria-checked={expensesEnabled}
          onClick={() => {
            setExpensesTouched(true);
            setExpensesEnabled((enabled) => !enabled);
          }}
          className={`relative h-8 w-14 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
            expensesEnabled ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
              expensesEnabled ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="grid gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <label htmlFor="expense_currency" className="kk-label">
            {t("expenseCurrency")}
          </label>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {t("expenseCurrencyHint")}
          </p>
        </div>
        <select
          id="expense_currency"
          name="expense_currency"
          defaultValue={defaultExpenseCurrency}
          className="kk-input sm:w-32"
        >
          {eventCurrencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </div>

      {selected === "paid" ? (
        <div className="grid gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/30 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <label htmlFor="ticket_price" className="kk-label">
              {t("ticketPrice")}
            </label>
            <input
              id="ticket_price"
              name="ticket_price"
              type="number"
              min="1"
              step="1000"
              required
              defaultValue={defaultPrice}
              placeholder={t("ticketPricePlaceholder")}
              className="kk-input"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ticket_currency" className="kk-label">
              {t("ticketCurrency")}
            </label>
            <select
              id="ticket_currency"
              name="ticket_currency"
              defaultValue={defaultTicketCurrency}
              className="kk-input"
            >
              {eventCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-violet-900/80 dark:text-violet-100/80 sm:col-span-2">
            {t("ticketHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
