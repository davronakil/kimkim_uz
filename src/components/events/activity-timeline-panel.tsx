"use client";

import {
  CheckCircle2,
  CircleHelp,
  Copy,
  MessageSquare,
  Receipt,
  Send,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { Comment, EventMember, Expense } from "@/types";
import { displayName, formatMoney } from "@/lib/utils";
import { buildTelegramShareUrl } from "@/lib/auth/telegram";

type ActivityItem = {
  id: string;
  at: string;
  icon: typeof UserPlus;
  title: string;
  body: string;
};

function flattenComments(comments: Comment[]): Comment[] {
  return comments.flatMap((comment) => [comment, ...flattenComments(comment.replies ?? [])]);
}

function isLaterRsvpUpdate(member: EventMember) {
  if (!member.rsvp_updated_at) return false;
  const joinedAt = new Date(member.joined_at).getTime();
  const rsvpAt = new Date(member.rsvp_updated_at).getTime();
  return Number.isFinite(joinedAt) && Number.isFinite(rsvpAt) && rsvpAt - joinedAt > 60_000;
}

function rsvpIcon(status: EventMember["rsvp_status"]) {
  if (status === "declined") return XCircle;
  if (status === "maybe") return CircleHelp;
  return CheckCircle2;
}

export function ActivityTimelinePanel({
  members,
  comments,
  expenses,
  locale,
}: {
  members: EventMember[];
  comments: Comment[];
  expenses: Expense[];
  locale: string;
}) {
  const t = useTranslations("events.activity");
  const rsvpT = useTranslations("events.rsvp");
  const format = useFormatter();
  const [copied, setCopied] = useState(false);

  const items = useMemo(() => {
    const activity: ActivityItem[] = [
      ...members.map((member) => ({
        id: `join:${member.id}`,
        at: member.joined_at,
        icon: UserPlus,
        title: t("joinedTitle", { name: displayName(member) }),
        body: t("joinedBody"),
      })),
      ...members.filter(isLaterRsvpUpdate).map((member) => {
        const status = member.rsvp_status ?? "going";
        return {
          id: `rsvp:${member.id}:${member.rsvp_updated_at}`,
          at: member.rsvp_updated_at ?? member.joined_at,
          icon: rsvpIcon(status),
          title: t("rsvpTitle", { name: displayName(member) }),
          body: t("rsvpBody", { status: rsvpT(status) }),
        };
      }),
      ...flattenComments(comments).map((comment) => ({
        id: `comment:${comment.id}`,
        at: comment.created_at,
        icon: MessageSquare,
        title: t("commentTitle", {
          name: comment.user ? displayName(comment.user) : t("unknown"),
        }),
        body: comment.body,
      })),
      ...expenses.map((expense) => ({
        id: `expense:${expense.id}`,
        at: expense.created_at,
        icon: Receipt,
        title: t("expenseTitle", {
          name: expense.payer ? displayName(expense.payer) : t("unknown"),
          amount: formatMoney(expense.amount_cents, expense.currency, locale),
        }),
        body: expense.description,
      })),
    ];

    return activity
      .filter((item) => item.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [comments, expenses, locale, members, rsvpT, t]);

  if (items.length === 0) return null;

  function activityText() {
    return [
      t("copyTitle"),
      ...items.map((item) =>
        t("copyLine", {
          time: format.dateTime(new Date(item.at), {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          title: item.title,
          body: item.body,
        }),
      ),
    ].join("\n");
  }

  async function copyActivity() {
    await navigator.clipboard.writeText(activityText());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function shareActivity() {
    window.open(
      buildTelegramShareUrl(window.location.href, activityText()),
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <section className="kk-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="kk-section-title">{t("title")}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("subtitle")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => void copyActivity()} className="kk-btn-secondary w-full">
            <Copy className="h-4 w-4" />
            {copied ? t("copied") : t("copy")}
          </button>
          <button type="button" onClick={shareActivity} className="kk-btn-secondary w-full">
            <Send className="h-4 w-4" />
            {t("share")}
          </button>
        </div>
      </div>
      <ol className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <p className="text-sm font-medium">{item.title}</p>
                  <time className="text-xs text-zinc-500 dark:text-zinc-400" dateTime={item.at}>
                    {format.relativeTime(new Date(item.at))}
                  </time>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {item.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
