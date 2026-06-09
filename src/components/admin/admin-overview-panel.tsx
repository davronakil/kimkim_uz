"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarRange,
  Compass,
  GitBranch,
  Store,
  ThumbsUp,
  Users,
} from "lucide-react";
import type { PlatformOverviewStats } from "@/lib/db/admin-queries";

type AdminOverviewPanelProps = {
  onNavigate: (tab: "catalog" | "events" | "users") => void;
};

export function AdminOverviewPanel({ onNavigate }: AdminOverviewPanelProps) {
  const t = useTranslations("admin.overview");
  const common = useTranslations("common");
  const [stats, setStats] = useState<PlatformOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/overview", { credentials: "include" });
      if (response.ok) {
        const data = (await response.json()) as { stats: PlatformOverviewStats };
        setStats(data.stats);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="text-zinc-500">{common("loading")}</p>;
  }

  if (!stats) {
    return <p className="text-zinc-500">{t("loadError")}</p>;
  }

  const statCards = [
    { label: t("stats.users"), value: stats.users, icon: Users, action: () => onNavigate("users") },
    { label: t("stats.events"), value: stats.events, icon: CalendarRange, action: () => onNavigate("events") },
    {
      label: t("stats.publicEvents"),
      value: stats.publicEvents,
      icon: Compass,
      action: () => onNavigate("events"),
    },
    { label: t("stats.referralJoins"), value: stats.referralJoins, icon: GitBranch },
    {
      label: t("stats.referralJoins7d"),
      value: stats.referralJoins7d,
      icon: GitBranch,
      highlight: stats.referralJoins7d > 0,
    },
    {
      label: t("stats.catalogPending"),
      value: stats.catalogPending,
      icon: Store,
      action: () => onNavigate("catalog"),
      highlight: stats.catalogPending > 0,
    },
    {
      label: t("stats.catalogApproved"),
      value: stats.catalogApproved,
      icon: Store,
      action: () => onNavigate("catalog"),
    },
    { label: t("stats.vouches"), value: stats.vouches, icon: ThumbsUp },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          const content = (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{card.label}</p>
                <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{card.value}</p>
            </>
          );

          if (card.action) {
            return (
              <button
                key={card.label}
                type="button"
                onClick={card.action}
                className={`rounded-2xl border p-5 text-left transition hover:border-emerald-200 hover:shadow-sm dark:hover:border-emerald-900 ${
                  card.highlight
                    ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {content}
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">{t("toolsTitle")}</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/catalog" className="kk-btn-secondary">
            {t("openCatalog")}
          </Link>
          <Link href="/discover" className="kk-btn-secondary">
            {t("openDiscover")}
          </Link>
          <Link href="/events" className="kk-btn-secondary">
            {t("openEvents")}
          </Link>
        </div>
      </div>
    </div>
  );
}
