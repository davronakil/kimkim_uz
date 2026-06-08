"use client";

import { Banknote, CircleDollarSign, Gift, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { EventPaymentMode } from "@/lib/events/payment-mode";

const modeIcons: Record<EventPaymentMode, typeof Gift> = {
  free: Gift,
  split: Users,
  pay_yourself: CircleDollarSign,
  paid: Banknote,
};

const modeStyles: Record<EventPaymentMode, string> = {
  free: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  split: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100",
  pay_yourself:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  paid: "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-100",
};

export function PaymentModeBadge({
  mode,
  size = "md",
  showHint = false,
}: {
  mode: EventPaymentMode;
  size?: "sm" | "md";
  showHint?: boolean;
}) {
  const t = useTranslations("events.paymentMode");
  const Icon = modeIcons[mode];

  return (
    <div className={size === "sm" ? "inline-flex flex-col gap-1" : "space-y-2"}>
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium ${modeStyles[mode]} ${
          size === "sm" ? "text-xs" : "text-sm"
        }`}
      >
        <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {t(`labels.${mode}`)}
      </span>
      {showHint ? (
        <p className={`text-zinc-600 dark:text-zinc-300 ${size === "sm" ? "text-xs" : "text-sm"}`}>
          {t(`hints.${mode}`)}
        </p>
      ) : null}
    </div>
  );
}
