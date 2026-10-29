"use client";

import { CheckCircle2, Copy, Share2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Expense, PublicEventMember, Settlement, SettlementPayment } from "@/types";
import { SettlementPayMethods } from "@/components/events/settlement-pay-methods";
import { Link } from "@/i18n/navigation";
import { buildTelegramShareUrl } from "@/lib/auth/telegram";
import { formatEventDateTime } from "@/lib/events/timezone";
import { allocateWeightedCents } from "@/lib/expense/mutations";
import { canUndoSettlementPayment } from "@/lib/expense/settlement";
import { PAYMENT_METHODS_CURRENCY, type PaymentMethod } from "@/lib/payments/methods";
import { centsToMajor, displayName, formatMoney, majorToCents } from "@/lib/utils";

type ExpenseMember = Pick<PublicEventMember, "id" | "first_name" | "last_name" | "username"> & {
  additional_guest_count?: number;
};

type PaymentHistoryItem =
  | { kind: "single"; payment: SettlementPayment }
  | { kind: "settleUp"; settleUpId: string; payments: SettlementPayment[] };

function groupPaymentHistory(payments: SettlementPayment[]): PaymentHistoryItem[] {
  const items: PaymentHistoryItem[] = [];
  const groups = new Map<string, SettlementPayment[]>();
  for (const payment of payments) {
    if (!payment.settle_up_id) {
      items.push({ kind: "single", payment });
      continue;
    }
    const group = groups.get(payment.settle_up_id);
    if (group) {
      group.push(payment);
      continue;
    }
    const created = [payment];
    groups.set(payment.settle_up_id, created);
    items.push({ kind: "settleUp", settleUpId: payment.settle_up_id, payments: created });
  }
  return items;
}

const RECENT_UNDO_MS = 10_000;

export function ExpensePanel({
  eventId,
  members,
  expenses,
  settlements,
  settlementPayments = [],
  paymentMethods = {},
  currentUserId,
  canSettleUp = false,
  eventTitle,
  timeZone = "UTC",
  locale,
  currency = "UZS",
  onAdded,
  readOnly = false,
}: {
  eventId: string;
  members: ExpenseMember[];
  expenses: Expense[];
  settlements: Settlement[];
  settlementPayments?: SettlementPayment[];
  paymentMethods?: Record<string, PaymentMethod[]>;
  currentUserId?: string;
  /** Event owner: can settle up every line at once and undo that settle-up. */
  canSettleUp?: boolean;
  eventTitle?: string;
  timeZone?: string;
  locale: string;
  currency?: string;
  onAdded: () => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("events.expenses");
  const pay = useTranslations("events.expenses.pay");
  const settle = useTranslations("events.expenses.settle");
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
  const [settleBusy, setSettleBusy] = useState<string | null>(null);
  const [settleError, setSettleError] = useState(false);
  const [confirmSettleUp, setConfirmSettleUp] = useState(false);
  const [recentPayment, setRecentPayment] = useState<SettlementPayment | null>(null);

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
    const useEqual = expense.split_mode === "equal" || (expense.split_mode !== "custom" && allEqual);

    if (useEqual) {
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
  const shareCount = (member: ExpenseMember) => 1 + (member.additional_guest_count ?? 0);
  const equalPreview =
    splitMode === "equal" && amountNumber > 0 && splitIds.length > 0
      ? allocateWeightedCents(
          majorToCents(amountNumber),
          splitIds.map((userId) => {
            const member = memberMap.get(userId);
            return {
              user_id: userId,
              weight: member ? shareCount(member) : 1,
            };
          }),
        )
      : [];
  const canSubmit =
    description &&
    amountNumber > 0 &&
    (splitMode === "equal" ? splitIds.length > 0 : customValid);

  async function settleRequest(key: string, url: string, method: "POST" | "DELETE", body?: unknown) {
    setSettleBusy(key);
    setSettleError(false);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        setSettleError(true);
        return null;
      }
      return (await response.json()) as Record<string, unknown>;
    } catch {
      setSettleError(true);
      return null;
    } finally {
      setSettleBusy(null);
      onAdded();
    }
  }

  async function markPaid(settlement: Settlement) {
    const counterpart =
      settlement.from_user_id === currentUserId ? settlement.to_user_id : settlement.from_user_id;
    const data = await settleRequest(
      `mark:${settlement.from_user_id}:${settlement.to_user_id}:${settlement.currency}`,
      `/api/events/${eventId}/settlement-payments`,
      "POST",
      { counterpart_user_id: counterpart, currency: settlement.currency },
    );
    const payment = data?.payment as SettlementPayment | undefined;
    if (!payment) return;
    setRecentPayment(payment);
    window.setTimeout(
      () => setRecentPayment((current) => (current?.id === payment.id ? null : current)),
      RECENT_UNDO_MS,
    );
  }

  async function undoPayment(paymentId: string) {
    const data = await settleRequest(
      `undo:${paymentId}`,
      `/api/events/${eventId}/settlement-payments/${paymentId}`,
      "DELETE",
    );
    if (data) setRecentPayment((current) => (current?.id === paymentId ? null : current));
  }

  async function settleUpAll() {
    await settleRequest("settle-up", `/api/events/${eventId}/settle-up`, "POST");
    setConfirmSettleUp(false);
  }

  async function undoSettleUp(settleUpId: string) {
    await settleRequest(
      `undo-settle-up:${settleUpId}`,
      `/api/events/${eventId}/settle-up/${settleUpId}`,
      "DELETE",
    );
  }

  const nameOf = (userId: string | null) => {
    const member = userId ? memberMap.get(userId) : undefined;
    return member ? displayName(member) : "?";
  };
  const paymentHistory = groupPaymentHistory(settlementPayments);
  const settledAfterActivity =
    settlements.length === 0 && (expenses.length > 0 || settlementPayments.length > 0);

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
                    <span className="min-w-0">
                      <span className="block truncate">{displayName(member)}</span>
                      {shareCount(member) > 1 && splitMode === "equal" ? (
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          {t("equalShareCount", { count: shareCount(member) })}
                        </span>
                      ) : null}
                    </span>
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
            {splitMode === "equal" && equalPreview.length > 0 ? (
              <ul className="space-y-1.5 pt-1">
                {equalPreview.map((split) => {
                  const member = memberMap.get(split.user_id);
                  const shares = member ? shareCount(member) : 1;
                  return (
                    <li
                      key={split.user_id}
                      className="flex items-baseline justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-300"
                    >
                      <span className="min-w-0 truncate">
                        {member ? displayName(member) : "—"}
                        {shares > 1 ? (
                          <span className="ml-2 text-xs text-zinc-400">
                            {t("equalShareCount", { count: shares })}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatMoney(split.amount_cents, currency, locale)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
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
                <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatMoney(expense.amount_cents, expense.currency, locale)}
                </p>
              </div>
              {expense.splits && expense.splits.length > 0 ? (
                <ul className="space-y-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {expense.splits.map((split) => {
                    const member = memberMap.get(split.user_id);
                    const shares = member ? shareCount(member) : 1;
                    const name = member
                      ? displayName(member)
                      : split.user
                        ? displayName(split.user)
                        : "—";
                    return (
                      <li
                        key={split.user_id}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-200">
                          {name}
                          {expense.split_mode !== "custom" && shares > 1 ? (
                            <span className="ml-2 text-xs text-zinc-400">
                              {t("equalShareCount", { count: shares })}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatMoney(split.amount_cents, expense.currency, locale)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
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
              {canSettleUp && !readOnly ? (
                <button
                  type="button"
                  onClick={() => setConfirmSettleUp(true)}
                  disabled={confirmSettleUp}
                  className="kk-btn-primary inline-flex min-h-10 gap-2 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {settle("settleUp")}
                </button>
              ) : null}
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
        {confirmSettleUp ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <p className="font-medium">{settle("confirmTitle", { count: settlements.length })}</p>
            <p>{settle("confirmBody")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void settleUpAll()}
                disabled={settleBusy === "settle-up"}
                className="kk-btn-primary min-h-10"
              >
                {settleBusy === "settle-up" ? common("loading") : settle("confirm")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmSettleUp(false)}
                className="kk-btn-secondary min-h-10"
              >
                {common("cancel")}
              </button>
            </div>
          </div>
        ) : null}
        {recentPayment ? (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate">
                {settle("paidLine", {
                  from: nameOf(recentPayment.from_user_id),
                  to: nameOf(recentPayment.to_user_id),
                  amount: formatMoney(recentPayment.amount_cents, recentPayment.currency, locale),
                })}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void undoPayment(recentPayment.id)}
              disabled={settleBusy === `undo:${recentPayment.id}`}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 px-2 font-medium text-emerald-700 hover:underline dark:text-emerald-300"
            >
              <Undo2 className="h-4 w-4" />
              {settle("undo")}
            </button>
          </div>
        ) : null}
        {settleError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {settle("error")}
          </p>
        ) : null}
        {settlements.length === 0 ? (
          settledAfterActivity ? (
            <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              {settle("allSettled")}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">{t("settlementEmpty")}</p>
          )
        ) : (
          settlements.map((settlement) => {
            const from = memberMap.get(settlement.from_user_id);
            const to = memberMap.get(settlement.to_user_id);
            const toName = to ? displayName(to) : "?";
            const supportsMethods = settlement.currency === PAYMENT_METHODS_CURRENCY;
            const viewerOwes = supportsMethods && settlement.from_user_id === currentUserId;
            const viewerIsOwed = supportsMethods && settlement.to_user_id === currentUserId;
            const payeeMethods = paymentMethods[settlement.to_user_id] ?? [];
            const viewerIsParty =
              settlement.from_user_id === currentUserId || settlement.to_user_id === currentUserId;
            const markKey = `mark:${settlement.from_user_id}:${settlement.to_user_id}:${settlement.currency}`;
            return (
              <div
                key={`${settlement.from_user_id}-${settlement.to_user_id}-${settlement.currency}`}
                className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-base text-emerald-900 sm:text-sm dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    {t("owes", {
                      from: from ? displayName(from) : "?",
                      to: toName,
                      amount: formatMoney(
                        settlement.amount_cents,
                        settlement.currency,
                        locale,
                      ),
                    })}
                  </p>
                  {viewerIsParty && !readOnly ? (
                    <button
                      type="button"
                      onClick={() => void markPaid(settlement)}
                      disabled={settleBusy !== null}
                      className="kk-btn-secondary min-h-10 shrink-0 text-sm"
                    >
                      {settleBusy === markKey ? common("loading") : settle("markPaid")}
                    </button>
                  ) : null}
                </div>
                {viewerOwes && payeeMethods.length > 0 ? (
                  <SettlementPayMethods
                    methods={payeeMethods}
                    amountCents={settlement.amount_cents}
                    note={eventTitle ? `${eventTitle} · KimKim` : "KimKim"}
                  />
                ) : null}
                {viewerOwes && payeeMethods.length === 0 ? (
                  <p className="text-xs text-emerald-800/70 dark:text-emerald-200/70">
                    {pay("noMethods", { name: toName })}
                  </p>
                ) : null}
                {viewerIsOwed && payeeMethods.length === 0 ? (
                  <p className="text-xs text-emerald-800/70 dark:text-emerald-200/70">
                    {pay("addYours")}{" "}
                    <Link href="/profile" className="font-medium underline">
                      {pay("addYoursLink")}
                    </Link>
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      {paymentHistory.length > 0 ? (
        <section className="space-y-3">
          <h3 className="kk-section-title">{settle("historyTitle")}</h3>
          <ul className="space-y-2">
            {paymentHistory.map((item) => {
              const renderLine = (payment: SettlementPayment, showUndo: boolean) => (
                <li
                  key={payment.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block text-zinc-800 dark:text-zinc-100">
                      {settle("paidLine", {
                        from: nameOf(payment.from_user_id),
                        to: nameOf(payment.to_user_id),
                        amount: formatMoney(payment.amount_cents, payment.currency, locale),
                      })}
                    </span>
                    {item.kind === "single" ? (
                      <span className="block text-xs text-zinc-500">
                        {settle("markedBy", {
                          name: nameOf(payment.recorded_by_user_id),
                          date: formatEventDateTime(payment.created_at, locale, timeZone),
                        })}
                      </span>
                    ) : null}
                  </span>
                  {showUndo && !readOnly ? (
                    <button
                      type="button"
                      onClick={() => void undoPayment(payment.id)}
                      disabled={settleBusy !== null}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1 px-2 text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-300"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      {settleBusy === `undo:${payment.id}` ? common("loading") : settle("undo")}
                    </button>
                  ) : null}
                </li>
              );

              if (item.kind === "single") {
                const undoable =
                  !!currentUserId &&
                  canUndoSettlementPayment(item.payment, currentUserId, canSettleUp);
                return (
                  <li key={item.payment.id} className="kk-card list-none p-3 sm:p-4">
                    <ul>{renderLine(item.payment, undoable)}</ul>
                  </li>
                );
              }

              const first = item.payments[0]!;
              return (
                <li key={item.settleUpId} className="kk-card list-none space-y-2 p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium">
                        {settle("settledUpBy", { name: nameOf(first.recorded_by_user_id) })}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {formatEventDateTime(first.created_at, locale, timeZone)}
                      </span>
                    </span>
                    {canSettleUp && !readOnly ? (
                      <button
                        type="button"
                        onClick={() => void undoSettleUp(item.settleUpId)}
                        disabled={settleBusy !== null}
                        className="kk-btn-secondary inline-flex min-h-9 shrink-0 gap-1.5 text-sm"
                      >
                        <Undo2 className="h-4 w-4" />
                        {settleBusy === `undo-settle-up:${item.settleUpId}`
                          ? common("loading")
                          : settle("undoSettleUp")}
                      </button>
                    ) : null}
                  </div>
                  <ul className="space-y-1.5 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                    {item.payments.map((payment) =>
                      renderLine(
                        payment,
                        !canSettleUp &&
                          !!currentUserId &&
                          canUndoSettlementPayment(payment, currentUserId, false),
                      ),
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
