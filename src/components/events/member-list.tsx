"use client";

import { CheckCircle2, CircleDollarSign, UserMinus, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { EventMember, EventPaymentMode, EventPaymentSummary } from "@/types";
import { displayName, formatMoney } from "@/lib/utils";

export function MemberList({
  eventId,
  members,
  paymentMode,
  paymentSummaries,
  ticketPriceCents,
  ticketCurrency,
  locale,
  currentUserId,
  canManage,
  onChanged,
}: {
  eventId: string;
  members: EventMember[];
  paymentMode: EventPaymentMode;
  paymentSummaries: EventPaymentSummary[];
  ticketPriceCents: number | null;
  ticketCurrency: string;
  locale: string;
  currentUserId: string;
  canManage: boolean;
  onChanged: () => void;
}) {
  const t = useTranslations("events");
  const common = useTranslations("common");
  const paymentT = useTranslations("events.memberPayments");
  const rsvpT = useTranslations("events.rsvp");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const paymentByUser = new Map(paymentSummaries.map((payment) => [payment.user_id, payment]));
  const showPaymentStatus = paymentMode === "paid";

  function referrerName(member: EventMember) {
    if (!member.referrer_user_id) return null;
    const name = [member.referrer_first_name, member.referrer_last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || (member.referrer_username ? `@${member.referrer_username}` : null);
  }

  async function removeMember(userId: string) {
    setRemovingId(userId);
    const response = await fetch(`/api/events/${eventId}/members/${userId}`, {
      method: "DELETE",
    });
    setRemovingId(null);
    setConfirmId(null);

    if (response.ok) {
      onChanged();
    }
  }

  async function setPaid(userId: string, paid: boolean) {
    setUpdatingPaymentId(userId);
    const response = await fetch(`/api/events/${eventId}/members/${userId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ paid }),
    });
    setUpdatingPaymentId(null);

    if (response.ok) {
      onChanged();
    }
  }

  return (
    <ul className="mt-4 space-y-3">
      {members.map((member) => {
        const canRemove =
          canManage && member.role !== "owner" && member.id !== currentUserId;
        const payment = paymentByUser.get(member.id);
        const paid = payment?.status === "completed";
        const invitedBy = canManage ? referrerName(member) : null;
        const ticketLabel =
          ticketPriceCents && ticketPriceCents > 0
            ? formatMoney(ticketPriceCents, ticketCurrency, locale)
            : null;

        return (
          <li
            key={member.id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:p-0 dark:border-zinc-800"
          >
            <div className="flex min-w-0 items-center gap-3">
              {member.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photo_url}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 sm:h-10 sm:w-10">
                  {member.first_name.charAt(0)}
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                <span className="truncate text-base font-medium sm:text-sm">
                  {displayName(member)}
                  {member.username ? (
                    <span className="ml-1 font-normal text-zinc-500">@{member.username}</span>
                  ) : null}
                </span>
                {member.role === "owner" ? (
                  <span className="w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    {t("ownerBadge")}
                  </span>
                ) : null}
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                    member.rsvp_status === "maybe"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      : member.rsvp_status === "declined"
                        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                  }`}
                >
                  {rsvpT(member.rsvp_status ?? "going")}
                </span>
                {showPaymentStatus ? (
                  <span
                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      paid
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    }`}
                  >
                    {paid ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <CircleDollarSign className="h-3.5 w-3.5" />
                    )}
                    {paid
                      ? paymentT(payment?.source === "stripe" ? "paidStripe" : "paidManual")
                      : paymentT("unpaid")}
                    {ticketLabel ? ` · ${ticketLabel}` : ""}
                  </span>
                ) : null}
                {invitedBy ? (
                  <span className="basis-full text-xs text-zinc-500 dark:text-zinc-400">
                    {t("invitedBy", { name: invitedBy })}
                  </span>
                ) : null}
              </span>
            </div>

            {canManage || canRemove ? (
              <div className="flex flex-wrap gap-2">
                {showPaymentStatus && canManage && member.role !== "owner" ? (
                  <button
                    type="button"
                    onClick={() => void setPaid(member.id, !paid)}
                    disabled={updatingPaymentId === member.id}
                    className={`kk-btn-secondary min-h-10 flex-1 sm:flex-none ${
                      paid ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {paid ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {updatingPaymentId === member.id
                      ? common("loading")
                      : paid
                        ? paymentT("markUnpaid")
                        : paymentT("markPaid")}
                  </button>
                ) : null}
                {canRemove ? (
                  confirmId === member.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void removeMember(member.id)}
                        disabled={removingId === member.id}
                        className="kk-btn min-h-10 flex-1 bg-red-600 px-4 text-white hover:bg-red-700 sm:flex-none"
                      >
                        {removingId === member.id ? common("loading") : common("delete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="kk-btn-secondary min-h-10 flex-1 sm:flex-none"
                      >
                        {common("cancel")}
                      </button>
                    </>
                  ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(member.id)}
                    className="kk-btn-secondary min-h-10 flex-1 sm:flex-none"
                    title={t("removeMember")}
                  >
                    <UserMinus className="h-4 w-4" />
                    {t("removeMember")}
                  </button>
                  )
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
