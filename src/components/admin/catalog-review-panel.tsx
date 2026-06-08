"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CategoryBadge } from "@/components/catalog/category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { BusinessListing } from "@/types";
import { Check, ClipboardList, X } from "lucide-react";

export function CatalogReviewPanel({ locale }: { locale: string }) {
  const t = useTranslations("admin.catalog");
  const common = useTranslations("common");
  const [pending, setPending] = useState<BusinessListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  async function loadPending() {
    const response = await fetch("/api/admin/catalog", { credentials: "include" });
    if (!response.ok) return;
    const data = (await response.json()) as { pending: BusinessListing[] };
    setPending(data.pending);
  }

  useEffect(() => {
    void (async () => {
      await loadPending();
      setLoading(false);
    })();
  }, []);

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
        setPending((items) => items.filter((item) => item.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-zinc-500">{common("loading")}</p>;
  }

  if (pending.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t("emptyTitle")}
        description={t("emptyBody")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((listing) => (
        <div
          key={listing.id}
          className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{listing.name}</h3>
                <CategoryBadge category={listing.category} locale={locale} size="sm" />
              </div>
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

          <textarea
            value={rejectReasons[listing.id] ?? ""}
            onChange={(e) =>
              setRejectReasons((prev) => ({ ...prev, [listing.id]: e.target.value }))
            }
            placeholder={t("rejectReasonPlaceholder")}
            rows={2}
            className="kk-input"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyId === listing.id}
              onClick={() => void review(listing.id, "approve")}
              className="kk-btn-primary"
            >
              <Check className="h-4 w-4" />
              {t("approve")}
            </button>
            <button
              type="button"
              disabled={busyId === listing.id}
              onClick={() => void review(listing.id, "reject")}
              className="kk-btn-secondary text-red-600"
            >
              <X className="h-4 w-4" />
              {t("reject")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
