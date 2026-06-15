"use client";

import { Check, ClipboardCopy, HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { displayName } from "@/lib/utils";
import type { EventMember, EventRsvpStatus } from "@/types";

const statusStyles: Record<
  EventRsvpStatus,
  {
    icon: typeof Check;
    className: string;
  }
> = {
  going: {
    icon: Check,
    className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
  maybe: {
    icon: HelpCircle,
    className: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  },
  declined: {
    icon: X,
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  },
};

const statuses: EventRsvpStatus[] = ["going", "maybe", "declined"];

function partySize(member: EventMember) {
  return member.rsvp_status === "declined"
    ? 0
    : 1 + (member.additional_guest_count ?? 0);
}

export function RsvpSummaryPanel({ members }: { members: EventMember[] }) {
  const t = useTranslations("events.rsvp");
  const [copied, setCopied] = useState(false);
  const summary = useMemo(() => {
    const grouped = members.reduce<Record<EventRsvpStatus, EventMember[]>>(
      (acc, member) => {
        const status = member.rsvp_status ?? "going";
        acc[status].push(member);
        return acc;
      },
      { going: [], maybe: [], declined: [] },
    );

    return {
      grouped,
      counts: {
        going: grouped.going.length,
        maybe: grouped.maybe.length,
        declined: grouped.declined.length,
      },
      partyCounts: {
        going: grouped.going.reduce((sum, member) => sum + partySize(member), 0),
        maybe: grouped.maybe.reduce((sum, member) => sum + partySize(member), 0),
        declined: 0,
      },
    };
  }, [members]);

  const copyText = [
    t("copyTitle"),
    ...statuses.map((status) => {
      const names = summary.grouped[status]
        .map((member) => {
          const extras = member.additional_guest_count ?? 0;
          return extras > 0 ? `${displayName(member)} +${extras}` : displayName(member);
        })
        .join(", ");
      return t("copyLine", {
        status: t(status),
        count: summary.partyCounts[status] || summary.counts[status],
        names: names || "-",
      });
    }),
  ].join("\n");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="kk-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="kk-section-title">{t("summaryTitle")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("summarySubtitle", {
              count: members.length,
              partyCount: summary.partyCounts.going + summary.partyCounts.maybe,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copySummary()}
          className="kk-btn-secondary min-h-10 w-full gap-2 text-sm sm:w-auto"
        >
          <ClipboardCopy className="h-4 w-4" />
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {statuses.map((status) => {
          const { icon: Icon, className } = statusStyles[status];
          return (
            <div
              key={status}
              className={`min-h-24 rounded-2xl p-3 sm:p-4 ${className}`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <div className="mt-3 text-2xl font-semibold leading-none sm:text-3xl">
                {summary.counts[status]}
              </div>
              <div className="mt-1 text-xs font-medium sm:text-sm">{t(status)}</div>
              {status !== "declined" ? (
                <div className="mt-1 text-xs opacity-80">
                  {t("partyCount", { count: summary.partyCounts[status] })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
