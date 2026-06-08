"use client";

import { CheckCircle2, ClipboardCopy, CreditCard, HandCoins, TimerReset } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";
import type { EventMember, EventPaymentSummary } from "@/types";

export function PaidEventSummaryPanel({
  members,
  paymentSummaries,
  ticketPriceCents,
  ticketCurrency,
  locale,
}: {
  members: EventMember[];
  paymentSummaries: EventPaymentSummary[];
  ticketPriceCents: number | null;
  ticketCurrency: string;
  locale: string;
}) {
  const t = useTranslations("events.paymentsSummary");
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => {
    const attendeeIds = new Set(
      members.filter((member) => member.role !== "owner").map((member) => member.id),
    );
    const payments = paymentSummaries.filter((payment) => attendeeIds.has(payment.user_id));
    const completed = payments.filter((payment) => payment.status === "completed");
    const paidUserIds = new Set(completed.map((payment) => payment.user_id));
    const unpaid = members.filter(
      (member) => member.role !== "owner" && !paidUserIds.has(member.id),
    );
    const stripe = completed.filter((payment) => payment.source === "stripe");
    const manual = completed.filter((payment) => payment.source === "manual");

    const receivedCents = completed.reduce((total, payment) => total + payment.amount_cents, 0);
    const stripeCents = stripe.reduce((total, payment) => total + payment.amount_cents, 0);
    const manualCents = manual.reduce((total, payment) => total + payment.amount_cents, 0);
    const expectedCents = (ticketPriceCents ?? 0) * attendeeIds.size;

    return {
      attendeeCount: attendeeIds.size,
      paidCount: paidUserIds.size,
      unpaidCount: unpaid.length,
      stripeCount: stripe.length,
      manualCount: manual.length,
      expectedCents,
      receivedCents,
      stripeCents,
      manualCents,
    };
  }, [members, paymentSummaries, ticketPriceCents]);

  const currency = ticketCurrency ?? "UZS";
  const settlementNote = [
    t("copyTitle"),
    t("copyExpected", {
      amount: formatMoney(summary.expectedCents, currency, locale),
      count: summary.attendeeCount,
    }),
    t("copyReceived", {
      amount: formatMoney(summary.receivedCents, currency, locale),
      count: summary.paidCount,
    }),
    t("copyUnpaid", { count: summary.unpaidCount }),
  ].join("\n");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(settlementNote);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const stats = [
    {
      label: t("expected"),
      value: formatMoney(summary.expectedCents, currency, locale),
      detail: t("attendees", { count: summary.attendeeCount }),
      icon: HandCoins,
    },
    {
      label: t("received"),
      value: formatMoney(summary.receivedCents, currency, locale),
      detail: t("paidCount", { count: summary.paidCount }),
      icon: CheckCircle2,
    },
    {
      label: t("card"),
      value: formatMoney(summary.stripeCents, currency, locale),
      detail: t("cardCount", { count: summary.stripeCount }),
      icon: CreditCard,
    },
    {
      label: t("manual"),
      value: formatMoney(summary.manualCents, currency, locale),
      detail: t("manualCount", { count: summary.manualCount }),
      icon: TimerReset,
    },
  ];

  return (
    <section className="kk-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="kk-section-title">{t("title")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copySummary()}
          className="kk-btn-secondary min-h-10 w-full gap-2 text-sm sm:w-auto"
        >
          <ClipboardCopy className="h-4 w-4" />
          {copied ? t("copied") : t("copy")}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {label}
            </div>
            <p className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              {value}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>
          </div>
        ))}
      </div>

      {summary.unpaidCount > 0 ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {t("unpaidHint", { count: summary.unpaidCount })}
        </p>
      ) : null}
    </section>
  );
}
