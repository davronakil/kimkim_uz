import { Check, HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
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

export function RsvpSummaryPanel({ members }: { members: EventMember[] }) {
  const t = useTranslations("events.rsvp");
  const counts = members.reduce<Record<EventRsvpStatus, number>>(
    (acc, member) => {
      const status = member.rsvp_status ?? "going";
      acc[status] += 1;
      return acc;
    },
    { going: 0, maybe: 0, declined: 0 },
  );

  return (
    <section className="kk-card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="kk-section-title">{t("summaryTitle")}</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {t("summarySubtitle", { count: members.length })}
        </p>
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
                {counts[status]}
              </div>
              <div className="mt-1 text-xs font-medium sm:text-sm">{t(status)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
