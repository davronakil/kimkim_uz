"use client";

import { HandCoins } from "lucide-react";
import { useTranslations } from "next-intl";
import { SettlementPayMethods } from "@/components/events/settlement-pay-methods";
import type { PaymentMethod } from "@/lib/payments/methods";
import { formatMoney } from "@/lib/utils";

export function HostTicketPaymentPanel({
  hostName,
  methods,
  ticketPriceCents,
  ticketCurrency,
  eventTitle,
  locale,
}: {
  hostName: string;
  methods: PaymentMethod[];
  ticketPriceCents: number | null;
  ticketCurrency: string;
  eventTitle: string;
  locale: string;
}) {
  const t = useTranslations("events.hostPayment");
  const amountCents = ticketPriceCents && ticketPriceCents > 0 ? ticketPriceCents : null;

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 sm:p-5 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
      <div className="flex items-start gap-3">
        <HandCoins className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{t("title", { name: hostName })}</h2>
          <p className="mt-0.5 text-sm text-emerald-800/80 dark:text-emerald-200/80">
            {amountCents
              ? t("ticketPrice", { amount: formatMoney(amountCents, ticketCurrency, locale) })
              : t("noPrice")}
          </p>
        </div>
      </div>
      <SettlementPayMethods
        methods={methods}
        amountCents={amountCents}
        note={`${eventTitle} · KimKim`}
      />
    </section>
  );
}
