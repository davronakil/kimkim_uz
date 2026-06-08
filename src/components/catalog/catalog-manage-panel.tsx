"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CategoryBadge } from "@/components/catalog/category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils";
import type { BusinessListing } from "@/types";
import { Clock, Plus, ShoppingBag, Store } from "lucide-react";

type SlotSummary = {
  used: number;
  total: number;
  remaining: number;
};

type ExtraSlotInfo = {
  available: boolean;
  priceCents: number;
  currency: string;
};

type ManagePanelProps = {
  locale: string;
  slotSessionId?: string;
  slotCheckoutCancelled?: boolean;
};

export function CatalogManagePanel({
  locale,
  slotSessionId,
  slotCheckoutCancelled,
}: ManagePanelProps) {
  const t = useTranslations("catalog");
  const common = useTranslations("common");
  const router = useRouter();
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [slots, setSlots] = useState<SlotSummary | null>(null);
  const [extraSlot, setExtraSlot] = useState<ExtraSlotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [slotMessage, setSlotMessage] = useState<string | null>(null);

  async function loadData() {
    const response = await fetch("/api/catalog/me", { credentials: "include" });
    if (!response.ok) return;
    const data = (await response.json()) as {
      listings: BusinessListing[];
      slots: SlotSummary;
      extraSlot: ExtraSlotInfo;
    };
    setListings(data.listings);
    setSlots(data.slots);
    setExtraSlot(data.extraSlot);
  }

  useEffect(() => {
    void (async () => {
      if (slotSessionId) {
        const response = await fetch(
          `/api/catalog/slots/checkout?session_id=${encodeURIComponent(slotSessionId)}`,
          { credentials: "include" },
        );
        if (response.ok) {
          const result = (await response.json()) as { fulfilled?: boolean };
          setSlotMessage(result.fulfilled ? t("slotPurchaseSuccess") : t("slotPurchasePending"));
        }
        router.replace("/catalog/manage");
      }

      await loadData();
      setLoading(false);
    })();
  }, [slotSessionId, router, t]);

  useEffect(() => {
    if (slotCheckoutCancelled) {
      setSlotMessage(t("slotPurchaseCancelled"));
    }
  }, [slotCheckoutCancelled, t]);

  async function buySlot() {
    setBuying(true);
    setSlotMessage(null);
    try {
      const response = await fetch("/api/catalog/slots/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setSlotMessage(data.error ?? t("slotPurchaseError"));
    } catch {
      setSlotMessage(t("slotPurchaseError"));
    } finally {
      setBuying(false);
    }
  }

  function statusLabel(status: BusinessListing["status"]) {
    if (status === "approved") return t("statusApproved");
    if (status === "rejected") return t("statusRejected");
    return t("statusPending");
  }

  if (loading) {
    return <p className="text-zinc-500">{common("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      {slotMessage ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {slotMessage}
        </p>
      ) : null}

      {slots ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">{t("slotsTitle")}</p>
              <p className="text-lg font-semibold">
                {t("slotsSummary", { used: slots.used, total: slots.total, remaining: slots.remaining })}
              </p>
            </div>
            {extraSlot?.available && slots.remaining <= 0 ? (
              <button
                type="button"
                onClick={() => void buySlot()}
                disabled={buying}
                className="kk-btn-primary"
              >
                <ShoppingBag className="h-4 w-4" />
                {buying
                  ? common("loading")
                  : t("buyExtraSlot", {
                      price: formatMoney(extraSlot.priceCents, extraSlot.currency, locale),
                    })}
              </button>
            ) : null}
          </div>
          {extraSlot?.available && slots.remaining > 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              {t("extraSlotHint", {
                price: formatMoney(extraSlot.priceCents, extraSlot.currency, locale),
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{t("myListings")}</h2>
        {slots && slots.remaining > 0 ? (
          <Link href="/catalog/submit" className="kk-btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            {t("submitListing")}
          </Link>
        ) : null}
      </div>

      {listings.length === 0 ? (
        <EmptyState icon={Store} title={t("noListingsTitle")} description={t("noListingsBody")}>
          {slots && slots.remaining > 0 ? (
            <Link href="/catalog/submit" className="kk-btn-primary w-full sm:w-auto">
              {t("submitListing")}
            </Link>
          ) : extraSlot?.available ? (
            <button type="button" onClick={() => void buySlot()} className="kk-btn-primary">
              {t("buyExtraSlotShort")}
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/catalog/${listing.id}`} className="font-semibold hover:text-emerald-600">
                    {listing.name}
                  </Link>
                  <CategoryBadge category={listing.category} locale={locale} size="sm" />
                </div>
                <p className="inline-flex items-center gap-1 text-sm text-zinc-500">
                  <Clock className="h-3.5 w-3.5" />
                  {statusLabel(listing.status)}
                </p>
                {listing.status === "rejected" && listing.rejection_reason ? (
                  <p className="text-sm text-red-600">{listing.rejection_reason}</p>
                ) : null}
              </div>
              <Link href={`/catalog/${listing.id}/edit`} className="kk-btn-secondary shrink-0">
                {common("edit")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
