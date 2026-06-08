"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Expense, Settlement, User } from "@/types";
import { displayName, formatMoney } from "@/lib/utils";

export function ExpensePanel({
  eventId,
  members,
  expenses,
  settlements,
  locale,
  onAdded,
}: {
  eventId: string;
  members: User[];
  expenses: Expense[];
  settlements: Settlement[];
  locale: string;
  onAdded: () => void;
}) {
  const t = useTranslations("events.expenses");
  const common = useTranslations("common");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState(members[0]?.id ?? "");
  const [splitIds, setSplitIds] = useState<string[]>(members.map((member) => member.id));
  const [submitting, setSubmitting] = useState(false);

  function toggleSplit(userId: string) {
    setSplitIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function submit() {
    setSubmitting(true);
    await fetch(`/api/events/${eventId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        amount: Number(amount),
        payer_id: payerId,
        split_user_ids: splitIds,
      }),
    });
    setSubmitting(false);
    setDescription("");
    setAmount("");
    onAdded();
  }

  const memberMap = new Map(members.map((member) => [member.id, member]));

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-medium">{t("add")}</h3>
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("description")}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={t("amount")}
          type="number"
          min="0"
          step="0.01"
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <label className="block text-sm">
          {t("paidBy")}
          <select
            value={payerId}
            onChange={(event) => setPayerId(event.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {displayName(member)}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-sm">{t("splitAmong")}</p>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <label key={member.id} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={splitIds.includes(member.id)}
                  onChange={() => toggleSplit(member.id)}
                />
                {displayName(member)}
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          disabled={submitting || !description || !amount || splitIds.length === 0}
          onClick={submit}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? common("loading") : t("add")}
        </button>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">{t("title")}</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("settlementEmpty")}</p>
        ) : (
          expenses.map((expense) => (
            <article
              key={expense.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{expense.description}</p>
                <p>{formatMoney(expense.amount_cents, expense.currency, locale)}</p>
              </div>
              <p className="mt-1 text-zinc-500">
                {t("paidBy")}: {expense.payer ? displayName(expense.payer) : "—"}
              </p>
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">{t("settlementTitle")}</h3>
        {settlements.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("settlementEmpty")}</p>
        ) : (
          settlements.map((settlement) => {
            const from = memberMap.get(settlement.from_user_id);
            const to = memberMap.get(settlement.to_user_id);
            return (
              <p
                key={`${settlement.from_user_id}-${settlement.to_user_id}`}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
              >
                {t("owes", {
                  from: from ? displayName(from) : "?",
                  to: to ? displayName(to) : "?",
                  amount: formatMoney(
                    settlement.amount_cents,
                    settlement.currency,
                    locale,
                  ),
                })}
              </p>
            );
          })
        )}
      </section>
    </div>
  );
}
