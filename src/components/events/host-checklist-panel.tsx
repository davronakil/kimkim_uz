"use client";

import {
  Banknote,
  CheckCircle2,
  Circle,
  MapPin,
  MessageCircle,
  Share2,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Comment, Event, EventMember, EventPaymentSummary, Expense } from "@/types";

type PayoutPreference = {
  payout_method: string | null;
  payout_details: string | null;
  payout_updated_at: string | null;
};

export function HostChecklistPanel({
  event,
  members,
  comments,
  expenses,
  paymentSummaries,
}: {
  event: Event;
  members: EventMember[];
  comments: Comment[];
  expenses: Expense[];
  paymentSummaries: EventPaymentSummary[];
}) {
  const t = useTranslations("events.hostChecklist");
  const [payoutPreference, setPayoutPreference] = useState<PayoutPreference | null>(null);

  const isPaidEvent = event.payment_mode === "paid";

  useEffect(() => {
    if (!isPaidEvent) return;

    async function loadPayoutPreference() {
      const response = await fetch("/api/auth/payout-method", { credentials: "include" });
      if (!response.ok) return;
      setPayoutPreference((await response.json()) as PayoutPreference);
    }

    void loadPayoutPreference();
  }, [isPaidEvent]);

  const items = useMemo(() => {
    const attendeeIds = new Set(
      members.filter((member) => member.role !== "owner").map((member) => member.id),
    );
    const paidUserIds = new Set(
      paymentSummaries
        .filter((payment) => payment.status === "completed")
        .map((payment) => payment.user_id),
    );
    const unpaidCount = [...attendeeIds].filter((userId) => !paidUserIds.has(userId)).length;
    const payoutReady = Boolean(
      payoutPreference?.payout_method?.trim() || payoutPreference?.payout_details?.trim(),
    );

    return [
      {
        key: "invite",
        icon: Share2,
        done: Boolean(event.invite_code),
        title: t("invite.title"),
        body: t("invite.body"),
      },
      {
        key: "location",
        icon: MapPin,
        done: Boolean(event.location_name || event.location_address || event.location_lat),
        title: t("location.title"),
        body: t("location.body"),
      },
      {
        key: "guests",
        icon: Users,
        done: members.length > 1,
        title: t("guests.title"),
        body: t("guests.body", { count: Math.max(members.length - 1, 0) }),
      },
      {
        key: "telegram",
        icon: MessageCircle,
        done: Boolean(event.telegram_chat_id),
        title: t("telegram.title"),
        body: t("telegram.body"),
      },
      {
        key: "activity",
        icon: CheckCircle2,
        done: comments.length + expenses.length > 0 || members.length > 1,
        title: t("activity.title"),
        body: t("activity.body"),
      },
      ...(isPaidEvent
        ? [
            {
              key: "payout",
              icon: WalletCards,
              done: payoutReady,
              title: t("payout.title"),
              body: t("payout.body"),
            },
            {
              key: "payments",
              icon: Banknote,
              done: attendeeIds.size > 0 && unpaidCount === 0,
              title: t("payments.title"),
              body: t("payments.body", { count: unpaidCount }),
            },
          ]
        : []),
    ];
  }, [comments.length, event, expenses.length, isPaidEvent, members, paymentSummaries, payoutPreference, t]);

  const doneCount = items.filter((item) => item.done).length;

  return (
    <section className="kk-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="kk-section-title">{t("title")}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("subtitle")}</p>
        </div>
        <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {t("progress", { done: doneCount, total: items.length })}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map(({ key, icon: Icon, done, title, body }) => (
          <div
            key={key}
            className={`rounded-2xl border p-4 ${
              done
                ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  done
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <p className="text-sm font-semibold">{title}</p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
