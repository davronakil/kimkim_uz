"use client";

import { Copy, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Expense, Settlement, User } from "@/types";
import { buildTelegramShareUrl } from "@/lib/auth/telegram";
import { centsToMajor, displayName, formatMoney } from "@/lib/utils";

export function ExpensePanel({
  eventId,
  members,
  expenses,
  settlements,
  locale,
  currency = "UZS",
  onAdded,
  readOnly = false,
}: {
  eventId: string;
  members: User[];
  expenses: Expense[];
  settlements: Settlement[];
  locale: string;
  currency?: string;
  onAdded: () => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("events.expenses");
  const common = useTranslations("common");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState(members[0]?.id ?? "");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [copiedSettlement, setCopiedSettlement] = useState(false);
  const [splitIds, setSplitIds] = useState<string[]>(members.map((member) => member.id));
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((member) => [member.id, ""])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function toggleSplit(userId: string) {
    setSplitIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function resetForm() {
    setDescription("");
    setAmount("");
    setPayerId(members[0]?.id ?? "");
    setSplitMode("equal");
    setSplitIds(members.map((member) => member.id));
    setCustomAmounts(Object.fromEntries(members.map((member) => [member.id, ""])));
    setEditingId(null);
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setConfirmDeleteId(null);
    setDescription(expense.description);
    setAmount(String(centsToMajor(expense.amount_cents)));
    setPayerId(expense.payer_id);

    const splitUserIds = expense.splits?.map((split) => split.user_id) ?? [];
    setSplitIds(splitUserIds.length > 0 ? splitUserIds : members.map((member) => member.id));

    const allEqual =
      expense.splits &&
      expense.splits.length > 0 &&
      expense.splits.every(
        (split) => split.amount_cents === expense.splits![0]?.amount_cents,
      );

    if (allEqual) {
      setSplitMode("equal");
      setCustomAmounts(Object.fromEntries(members.map((member) => [member.id, ""])));
    } else {
      setSplitMode("custom");
      setCustomAmounts(
        Object.fromEntries(
          members.map((member) => {
            const split = expense.splits?.find((item) => item.user_id === member.id);
            return [
              member.id,
              split ? String(centsToMajor(split.amount_cents)) : "",
            ];
          }),
        ),
      );
    }
  }

  const customTotal = splitIds.reduce((sum, id) => {
    return sum + (Number(customAmounts[id]) || 0);
  }, 0);

  const amountNumber = Number(amount) || 0;
  const customValid =
    splitMode === "custom" &&
    splitIds.length > 0 &&
    Math.abs(customTotal - amountNumber) < 0.01;

  function buildBody() {
    return splitMode === "equal"
      ? {
          description,
          amount: amountNumber,
          currency,
          payer_id: payerId,
          split_mode: "equal" as const,
          split_user_ids: splitIds,
        }
      : {
          description,
          amount: amountNumber,
          currency,
          payer_id: payerId,
          split_mode: "custom" as const,
          custom_splits: splitIds.map((userId) => ({
            user_id: userId,
            amount: Number(customAmounts[userId]) || 0,
          })),
        };
  }

  async function submit() {
    setSubmitting(true);
    const body = buildBody();
    const url = editingId
      ? `/api/events/${eventId}/expenses/${editingId}`
      : `/api/events/${eventId}/expenses`;

    await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    setSubmitting(false);
    resetForm();
    onAdded();
  }

  const memberMap = new Map(members.map((member) => [member.id, member]));
  const canSubmit =
    description &&
    amountNumber > 0 &&
    (splitMode === "equal" ? splitIds.length > 0 : customValid);

  async function deleteExpense(expenseId: string) {
    setDeletingId(expenseId);
    const response = await fetch(`/api/events/${eventId}/expenses/${expenseId}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    setConfirmDeleteId(null);

    if (response.ok) {
      if (editingId === expenseId) resetForm();
      onAdded();
    }
  }

  return (
    <div className="space-y-6">
      {!readOnly ? (
        <section className="kk-card space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="kk-section-title">{editingId ? t("edit") : t("add")}</h3>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-11 px-3 text-sm font-medium text-zinc-500 hover:underline"
              >
                {common("cancel")}
              </button>
            ) : null}
          </div>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("description")}
            className="kk-input"
          />
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={t("amount")}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="kk-input"
          />
          <label className="kk-label">
            {t("paidBy")}
            <select
              value={payerId}
              onChange={(event) => setPayerId(event.target.value)}
              className="kk-input mt-2"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {displayName(member)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSplitMode("equal")}
              className={splitMode === "equal" ? "kk-chip-active w-full" : "kk-chip-inactive w-full"}
            >
              {t("splitEqual")}
            </button>
            <button
              type="button"
              onClick={() => setSplitMode("custom")}
              className={splitMode === "custom" ? "kk-chip-active w-full" : "kk-chip-inactive w-full"}
            >
              {t("splitCustom")}
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-base font-medium sm:text-sm">{t("splitAmong")}</p>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-2 rounded-xl border border-zinc-100 p-3 sm:flex-row sm:items-center sm:border-0 sm:p-0 dark:border-zinc-800"
                >
                  <label className="inline-flex min-h-11 flex-1 items-center gap-3 text-base sm:text-sm">
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 rounded border-zinc-300"
                      checked={splitIds.includes(member.id)}
                      onChange={() => toggleSplit(member.id)}
                    />
                    {displayName(member)}
                  </label>
                  {splitMode === "custom" && splitIds.includes(member.id) ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={customAmounts[member.id] ?? ""}
                      onChange={(event) =>
                        setCustomAmounts((current) => ({
                          ...current,
                          [member.id]: event.target.value,
                        }))
                      }
                      placeholder={t("customAmount")}
                      className="kk-input sm:max-w-[10rem]"
                    />
                  ) : null}
                </div>
              ))}
            </div>
            {splitMode === "custom" ? (
              <p
                className={`text-xs ${
                  customValid ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {t("customTotal", {
                  current: customTotal.toFixed(2),
                  target: amountNumber.toFixed(2),
                })}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            disabled={submitting || !canSubmit}
            onClick={() => void submit()}
            className="kk-btn-primary w-full sm:w-auto"
          >
            {submitting ? common("loading") : editingId ? common("save") : t("add")}
          </button>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="kk-section-title">{t("title")}</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("empty")}</p>
        ) : (
          expenses.map((expense) => (
            <article key={expense.id} className="kk-card space-y-3 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">{expense.description}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {t("paidBy")}: {expense.payer ? displayName(expense.payer) : "—"}
                  </p>
                </div>
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatMoney(expense.amount_cents, expense.currency, locale)}
                </p>
              </div>
              {!readOnly ? (
                <div className="flex flex-wrap gap-2">
                  {confirmDeleteId === expense.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void deleteExpense(expense.id)}
                        disabled={deletingId === expense.id}
                        className="kk-btn min-h-10 bg-red-600 px-4 text-white hover:bg-red-700"
                      >
                        {deletingId === expense.id ? common("loading") : t("delete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="kk-btn-secondary min-h-10"
                      >
                        {common("cancel")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(expense)}
                        className="kk-btn-secondary min-h-10 flex-1 sm:flex-none"
                      >
                        {t("edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(expense.id)}
                        className="kk-btn-secondary min-h-10 flex-1 text-red-600 sm:flex-none dark:text-red-400"
                      >
                        {t("delete")}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="kk-section-title">{t("settlementTitle")}</h3>
          {settlements.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const lines = settlements.map((settlement) => {
                    const from = memberMap.get(settlement.from_user_id);
                    const to = memberMap.get(settlement.to_user_id);
                    return t("owes", {
                      from: from ? displayName(from) : "?",
                      to: to ? displayName(to) : "?",
                      amount: formatMoney(
                        settlement.amount_cents,
                        settlement.currency,
                        locale,
                      ),
                    });
                  });
                  void navigator.clipboard.writeText(
                    `${t("settlementTitle")}\n${lines.join("\n")}`,
                  );
                  setCopiedSettlement(true);
                  window.setTimeout(() => setCopiedSettlement(false), 2000);
                }}
                className="kk-btn-secondary inline-flex min-h-10 gap-2 text-sm"
              >
                <Copy className="h-4 w-4" />
                {copiedSettlement ? t("settlementCopied") : t("copySettlement")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const lines = settlements.map((settlement) => {
                    const from = memberMap.get(settlement.from_user_id);
                    const to = memberMap.get(settlement.to_user_id);
                    return t("owes", {
                      from: from ? displayName(from) : "?",
                      to: to ? displayName(to) : "?",
                      amount: formatMoney(
                        settlement.amount_cents,
                        settlement.currency,
                        locale,
                      ),
                    });
                  });
                  window.open(
                    buildTelegramShareUrl(
                      window.location.href,
                      `${t("settlementTitle")}\n${lines.join("\n")}`,
                    ),
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
                className="kk-btn-secondary inline-flex min-h-10 gap-2 text-sm"
              >
                <Share2 className="h-4 w-4" />
                {t("shareSettlement")}
              </button>
            </div>
          ) : null}
        </div>
        {settlements.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("settlementEmpty")}</p>
        ) : (
          settlements.map((settlement) => {
            const from = memberMap.get(settlement.from_user_id);
            const to = memberMap.get(settlement.to_user_id);
            return (
              <p
                key={`${settlement.from_user_id}-${settlement.to_user_id}`}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-base text-emerald-900 sm:text-sm dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
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
