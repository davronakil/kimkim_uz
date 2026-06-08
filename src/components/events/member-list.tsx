"use client";

import { UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { EventMember } from "@/types";
import { displayName } from "@/lib/utils";

export function MemberList({
  eventId,
  members,
  currentUserId,
  canManage,
  onChanged,
}: {
  eventId: string;
  members: EventMember[];
  currentUserId: string;
  canManage: boolean;
  onChanged: () => void;
}) {
  const t = useTranslations("events");
  const common = useTranslations("common");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function removeMember(userId: string) {
    setRemovingId(userId);
    const response = await fetch(`/api/events/${eventId}/members/${userId}`, {
      method: "DELETE",
    });
    setRemovingId(null);
    setConfirmId(null);

    if (response.ok) {
      onChanged();
    }
  }

  return (
    <ul className="mt-4 space-y-3">
      {members.map((member) => {
        const canRemove =
          canManage && member.role !== "owner" && member.id !== currentUserId;

        return (
          <li
            key={member.id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:p-0 dark:border-zinc-800"
          >
            <div className="flex min-w-0 items-center gap-3">
              {member.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.photo_url}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 sm:h-10 sm:w-10">
                  {member.first_name.charAt(0)}
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                <span className="truncate text-base font-medium sm:text-sm">
                  {displayName(member)}
                  {member.username ? (
                    <span className="ml-1 font-normal text-zinc-500">@{member.username}</span>
                  ) : null}
                </span>
                {member.role === "owner" ? (
                  <span className="w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    {t("ownerBadge")}
                  </span>
                ) : null}
              </span>
            </div>

            {canRemove ? (
              confirmId === member.id ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void removeMember(member.id)}
                    disabled={removingId === member.id}
                    className="kk-btn min-h-10 flex-1 bg-red-600 px-4 text-white hover:bg-red-700 sm:flex-none"
                  >
                    {removingId === member.id ? common("loading") : common("delete")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="kk-btn-secondary min-h-10 flex-1 sm:flex-none"
                  >
                    {common("cancel")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(member.id)}
                  className="kk-btn-secondary min-h-10 w-full sm:w-auto"
                  title={t("removeMember")}
                >
                  <UserMinus className="h-4 w-4" />
                  {t("removeMember")}
                </button>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
