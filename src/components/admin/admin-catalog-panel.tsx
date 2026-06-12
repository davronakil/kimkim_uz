"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CategoryBadge } from "@/components/catalog/category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { AdminBusinessListingRow } from "@/lib/db/admin-queries";
import { displayName } from "@/lib/utils";
import type { BusinessListingStatus } from "@/types";
import { Check, ClipboardList, X } from "lucide-react";

type CatalogScope = "pending" | "all";
type StatusFilter = "all" | BusinessListingStatus;

export function AdminCatalogPanel({ locale }: { locale: string }) {
  const t = useTranslations("admin.catalog");
  const common = useTranslations("common");
  const [scope, setScope] = useState<CatalogScope>("pending");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [listings, setListings] = useState<AdminBusinessListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (scope === "all") {
      params.set("scope", "all");
      if (status !== "all") params.set("status", status);
    }

    const response = await fetch(`/api/admin/catalog?${params}`, { credentials: "include" });
    if (response.ok) {
      const data = (await response.json()) as {
        pending?: AdminBusinessListingRow[];
        listings?: AdminBusinessListingRow[];
      };
      setListings(scope === "pending" ? (data.pending ?? []) : (data.listings ?? []));
    }
    setLoading(false);
  }, [scope, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/catalog/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "reject" ? rejectReasons[id] : undefined,
        }),
      });
      if (response.ok) {
        await load();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScope("pending")}
          className={scope === "pending" ? "kk-chip-active" : "kk-chip-inactive"}
        >
          {t("pendingTab")}
        </button>
        <button
          type="button"
          onClick={() => setScope("all")}
          className={scope === "all" ? "kk-chip-active" : "kk-chip-inactive"}
        >
          {t("allTab")}
        </button>
      </div>

      {scope === "all" ? (
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={status === value ? "kk-chip-active" : "kk-chip-inactive"}
            >
              {t(`status.${value}`)}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="text-zinc-500">{common("loading")}</p>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={scope === "pending" ? t("emptyTitle") : t("allEmptyTitle")}
          description={scope === "pending" ? t("emptyBody") : t("allEmptyBody")}
        />
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{listing.name}</h3>
                    <CategoryBadge category={listing.category} locale={locale} size="sm" />
                    {scope === "all" ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          listing.status === "approved"
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                            : listing.status === "pending"
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                              : "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"
                        }`}
                      >
                        {t(`status.${listing.status}`)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-zinc-500">
                    {t("representative", { name: displayName(listing) })}
                    {listing.vouch_count > 0
                      ? ` · ${t("vouchesCount", { count: listing.vouch_count })}`
                      : ""}
                  </p>
                  {listing.description ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">{listing.description}</p>
                  ) : null}
                  {listing.location_name ? (
                    <p className="text-sm text-zinc-500">{listing.location_name}</p>
                  ) : null}
                </div>
                <Link href={`/catalog/${listing.id}`} className="kk-btn-secondary shrink-0">
                  {t("preview")}
                </Link>
              </div>

              {listing.status === "pending" || listing.status === "approved" ? (
                <textarea
                  value={rejectReasons[listing.id] ?? ""}
                  onChange={(e) =>
                    setRejectReasons((prev) => ({ ...prev, [listing.id]: e.target.value }))
                  }
                  placeholder={t("rejectReasonPlaceholder")}
                  rows={2}
                  className="kk-input"
                />
              ) : null}

              <div className="flex flex-wrap gap-2">
                {listing.status !== "approved" ? (
                  <button
                    type="button"
                    disabled={busyId === listing.id}
                    onClick={() => void review(listing.id, "approve")}
                    className="kk-btn-primary"
                  >
                    <Check className="h-4 w-4" />
                    {listing.status === "rejected" ? t("republish") : t("approve")}
                  </button>
                ) : null}
                {listing.status !== "rejected" ? (
                  <button
                    type="button"
                    disabled={busyId === listing.id}
                    onClick={() => void review(listing.id, "reject")}
                    className="kk-btn-secondary text-red-600"
                  >
                    <X className="h-4 w-4" />
                    {listing.status === "approved" ? t("unpublish") : t("reject")}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
