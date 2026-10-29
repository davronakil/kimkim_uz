"use client";

import { WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SettlementPayMethods } from "@/components/events/settlement-pay-methods";
import { Link } from "@/i18n/navigation";
import type { PaymentMethod } from "@/lib/payments/methods";

type PayoutPreference = {
  payout_method: string | null;
  payout_details: string | null;
  payout_updated_at: string | null;
};

export function PayoutMethodPanel({
  usesSavedMethods = false,
  hostMethods = [],
  ticketPriceCents = null,
  eventTitle,
}: {
  /** Paid USD event: the host's profile handles replace the free-text field when saved. */
  usesSavedMethods?: boolean;
  hostMethods?: PaymentMethod[];
  ticketPriceCents?: number | null;
  eventTitle?: string;
}) {
  const t = useTranslations("events.payout");
  const common = useTranslations("common");
  const showSavedMethods = usesSavedMethods && hostMethods.length > 0;
  const [preference, setPreference] = useState<PayoutPreference | null>(null);
  const [method, setMethod] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showSavedMethods) return;

    async function load() {
      const response = await fetch("/api/auth/payout-method", {
        credentials: "include",
      });
      if (!response.ok) return;

      const data = (await response.json()) as PayoutPreference;
      setPreference(data);
      setMethod(data.payout_method ?? "");
      setDetails(data.payout_details ?? "");
    }

    void load();
  }, [showSavedMethods]);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/auth/payout-method", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        payout_method: method,
        payout_details: details,
      }),
    });
    setSaving(false);

    if (response.ok) {
      setPreference((await response.json()) as PayoutPreference);
    }
  }

  return (
    <section id="payout-method" className="kk-card scroll-mt-24 space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
          <WalletCards className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="kk-section-title">{t("title")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {showSavedMethods ? t("savedSubtitle") : t("subtitle")}
          </p>
        </div>
      </div>

      {showSavedMethods ? (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 pb-3.5 dark:border-emerald-900 dark:bg-emerald-950">
            <SettlementPayMethods
              methods={hostMethods}
              amountCents={ticketPriceCents}
              note={eventTitle ? `${eventTitle} · KimKim` : "KimKim"}
            />
          </div>
          <Link href="/profile" className="inline-block text-sm font-medium text-emerald-700 underline dark:text-emerald-300">
            {t("editInProfile")}
          </Link>
        </>
      ) : (
        <>
          {usesSavedMethods ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
              {t("savedNudge")}{" "}
              <Link href="/profile" className="font-medium underline">
                {t("savedNudgeLink")}
              </Link>
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
            <label className="kk-label">
              {t("method")}
              <input
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                placeholder={t("methodPlaceholder")}
                className="kk-input mt-2"
              />
            </label>
            <label className="kk-label">
              {t("details")}
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder={t("detailsPlaceholder")}
                className="kk-input mt-2 min-h-24 resize-y"
              />
            </label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {preference?.payout_updated_at ? t("updated") : t("notSet")}
            </p>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="kk-btn-primary w-full sm:w-auto"
            >
              {saving ? common("loading") : common("save")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
