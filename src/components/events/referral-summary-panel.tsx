"use client";

import { UsersRound } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { displayName } from "@/lib/utils";
import type { EventMember } from "@/types";

type ReferralSummary = {
  referrerId: string;
  name: string;
  count: number;
};

function referrerName(member: EventMember) {
  const name = [member.referrer_first_name, member.referrer_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || (member.referrer_username ? `@${member.referrer_username}` : null);
}

export function ReferralSummaryPanel({ members }: { members: EventMember[] }) {
  const t = useTranslations("events.referrals");
  const summaries = useMemo(() => {
    const byReferrer = new Map<string, ReferralSummary>();

    for (const member of members) {
      if (!member.referrer_user_id) continue;
      const existing = byReferrer.get(member.referrer_user_id);
      if (existing) {
        existing.count += 1;
        continue;
      }

      byReferrer.set(member.referrer_user_id, {
        referrerId: member.referrer_user_id,
        name: referrerName(member) ?? displayName(member),
        count: 1,
      });
    }

    return [...byReferrer.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [members]);

  if (summaries.length === 0) return null;

  const total = summaries.reduce((sum, summary) => sum + summary.count, 0);

  return (
    <section className="kk-card space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
          <UsersRound className="h-5 w-5" />
        </span>
        <div>
          <h2 className="kk-section-title">{t("title")}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {t("subtitle", { count: total })}
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {summaries.map((summary) => (
          <div
            key={summary.referrerId}
            className="flex items-center justify-between rounded-xl border border-zinc-100 px-3 py-2 dark:border-zinc-800"
          >
            <span className="min-w-0 truncate text-sm font-medium">{summary.name}</span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {t("count", { count: summary.count })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
