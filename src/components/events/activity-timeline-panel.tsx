"use client";

import { MessageSquare, Receipt, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { Comment, EventMember, Expense } from "@/types";
import { displayName, formatMoney } from "@/lib/utils";

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
  const format = useFormatter();

  const items = useMemo(() => {
    const activity: ActivityItem[] = [
      ...members.map((member) => ({
        id: `join:${member.id}`,
        at: member.joined_at,
        icon: UserPlus,
        title: t("joinedTitle", { name: displayName(member) }),
        body: t("joinedBody"),
      })),
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
  }, [comments, expenses, locale, members, t]);

  if (items.length === 0) return null;

  return (
    <section className="kk-card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="kk-section-title">{t("title")}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("subtitle")}</p>
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
