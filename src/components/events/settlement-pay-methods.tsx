"use client";

import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type MouseEvent } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import {
  displayPaymentValue,
  isApplePlatform,
  paymentDeepLink,
  type PaymentDeepLink,
  type PaymentMethod,
  type PaymentMethodKind,
} from "@/lib/payments/methods";
import { isTelegramMiniApp, telegramWebApp } from "@/lib/pwa/telegram-webview";

const COPIED_RESET_MS = 2000;

export const paymentMethodLabels: Record<PaymentMethodKind, string> = {
  venmo: "Venmo",
  cashapp: "Cash App",
  zelle: "Zelle",
  apple_cash: "Apple Cash",
};

const iconButton =
  "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white";

function openWebLink(event: MouseEvent<HTMLAnchorElement>, link: PaymentDeepLink) {
  // Inside the Mini App a plain link stays in Telegram's webview instead of handing off to the app.
  const openLink = telegramWebApp()?.openLink;
  if (link.kind === "web" && openLink && isTelegramMiniApp()) {
    event.preventDefault();
    openLink(link.url);
  }
}

export function SettlementPayMethods({
  methods,
  amountCents,
  note,
}: {
  methods: PaymentMethod[];
  amountCents: number;
  note: string;
}) {
  const t = useTranslations("events.expenses.pay");
  const [copiedKind, setCopiedKind] = useState<PaymentMethodKind | null>(null);
  const [canMessage, setCanMessage] = useState(false);

  useEffect(() => {
    setCanMessage(
      isApplePlatform({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
      }),
    );
  }, []);

  async function copy(method: PaymentMethod) {
    if (await copyToClipboard(displayPaymentValue(method))) {
      setCopiedKind(method.kind);
      window.setTimeout(() => setCopiedKind(null), COPIED_RESET_MS);
    }
  }

  return (
    <ul className="space-y-2 border-t border-emerald-200/70 pt-3 dark:border-emerald-900">
      {methods.map((method) => {
        const label = paymentMethodLabels[method.kind];
        const link =
          method.kind === "apple_cash" && !canMessage
            ? null
            : paymentDeepLink(method, amountCents, note);
        const hint =
          method.kind === "venmo"
            ? t("venmoHint")
            : method.kind === "cashapp"
              ? t("cashAppHint")
              : method.kind === "zelle"
                ? t("zelleHint")
                : link
                  ? t("appleCashHint")
                  : null;

        return (
          <li key={method.kind} className="flex items-start gap-3">
            <div className="min-w-0 flex-1 py-0.5">
              <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{label}</p>
              <p className="truncate text-sm tabular-nums text-emerald-900/80 dark:text-emerald-100/80">
                {displayPaymentValue(method)}
              </p>
              {hint ? (
                <p className="mt-0.5 text-xs leading-relaxed text-emerald-800/70 dark:text-emerald-200/70">
                  {hint}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void copy(method)}
                className={iconButton}
                aria-label={t("copy", { method: label })}
                title={t("copy", { method: label })}
              >
                {copiedKind === method.kind ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              {link ? (
                <a
                  href={link.url}
                  target={link.kind === "web" ? "_blank" : undefined}
                  rel={link.kind === "web" ? "noopener noreferrer" : undefined}
                  onClick={(event) => openWebLink(event, link)}
                  className={iconButton}
                  aria-label={t("open", { method: label })}
                  title={t("open", { method: label })}
                >
                  {link.kind === "sms" ? (
                    <MessageCircle className="h-4 w-4" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
