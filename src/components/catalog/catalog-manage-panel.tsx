"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CategoryBadge } from "@/components/catalog/category-badge";
import { ConfirmContinueCard } from "@/components/ui/confirm-continue-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils";
import type { BusinessListing } from "@/types";
import { resolveBusinessCoverAccent } from "@/lib/catalog/cover-theme";
import { Plus, ShoppingBag, Store } from "lucide-react";

type SlotSummary = {
  used: number;
  total: number;
  remaining: number;
  unlimited?: boolean;
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
  const [confirmingSlot, setConfirmingSlot] = useState(false);
  const [slotConfirmed, setSlotConfirmed] = useState(false);
  const [slotMessage, setSlotMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void (async () => {
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const confirmSlotPurchase = useCallback(async () => {
    if (!slotSessionId) return;

    setConfirmingSlot(true);
    const response = await fetch(
      `/api/catalog/slots/checkout/confirm?session_id=${encodeURIComponent(slotSessionId)}`,
      { method: "POST", credentials: "include" },
    );

    if (response.ok) {
      const result = (await response.json()) as { fulfilled?: boolean };
      setSlotMessage(result.fulfilled ? t("slotPurchaseSuccess") : t("slotPurchasePending"));
    } else {
      setSlotMessage(t("slotPurchaseError"));
    }

    setSlotConfirmed(true);
    router.replace("/catalog/manage");
    await loadData();
    setConfirmingSlot(false);
  }, [loadData, router, slotSessionId, t]);

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

  function statusClass(status: BusinessListing["status"]) {
    if (status === "approved") {
      return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    }
    if (status === "rejected") {
      return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200";
    }
    return "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
  }

  if (slotSessionId && !slotConfirmed) {
    return (
      <ConfirmContinueCard
        title={t("confirmSlotTitle")}
        description={t("confirmSlotBody")}
        pending={confirmingSlot}
        message={slotMessage}
        onConfirm={() => void confirmSlotPurchase()}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-3xl bg-zinc-200/80 dark:bg-zinc-900" />
        <div className="h-24 animate-pulse rounded-3xl bg-zinc-200/80 dark:bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {slotMessage ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {slotMessage}
        </p>
      ) : null}

      {slots ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-500">{t("slotsTitle")}</p>
              <p className="mt-1 text-lg font-semibold">
                {slots.unlimited
                  ? t("slotsUnlimited", { used: slots.used })
                  : t("slotsSummary", {
                      used: slots.used,
                      total: slots.total,
                      remaining: slots.remaining,
                    })}
              </p>
              {!slots.unlimited && slots.total > 0 ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, (slots.used / slots.total) * 100)}%` }}
                  />
                </div>
              ) : null}
            </div>
            {extraSlot?.available && !slots.unlimited && slots.remaining <= 0 ? (
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
          {extraSlot?.available && !slots.unlimited && slots.remaining > 0 ? (
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
        {slots && (slots.unlimited || slots.remaining > 0) ? (
          <Link href="/catalog/submit" className="kk-btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            {t("submitListing")}
          </Link>
        ) : null}
      </div>

      {listings.length === 0 ? (
        <EmptyState icon={Store} title={t("noListingsTitle")} description={t("noListingsBody")}>
          {slots && (slots.unlimited || slots.remaining > 0) ? (
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
          {listings.map((listing) => {
            const accent = resolveBusinessCoverAccent(listing.category, listing.id);
            return (
              <div
                key={listing.id}
                className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                    {listing.cover_image_key ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/media/${listing.cover_image_key}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-2xl"
                        style={{
                          background: `linear-gradient(135deg, ${accent.gradientFrom}, ${accent.gradientTo})`,
                        }}
                        aria-hidden
                      >
                        {accent.emoji}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/catalog/${listing.id}`}
                        className="truncate font-semibold hover:text-emerald-600"
                      >
                        {listing.name}
                      </Link>
                      <CategoryBadge category={listing.category} locale={locale} size="sm" />
                    </div>
                    <p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(listing.status)}`}
                      >
                        {statusLabel(listing.status)}
                      </span>
                    </p>
                    {listing.status === "rejected" && listing.rejection_reason ? (
                      <p className="text-sm text-red-600">{listing.rejection_reason}</p>
                    ) : null}
                  </div>
                </div>
                <Link href={`/catalog/${listing.id}/edit`} className="kk-btn-secondary shrink-0">
                  {common("edit")}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
