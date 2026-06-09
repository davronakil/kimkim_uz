"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import type { AdminUserRow } from "@/lib/db/admin-queries";
import { intlLocale } from "@/lib/locale";
import type { Locale } from "@/i18n/config";
import { displayName } from "@/lib/utils";
import { Search, Users } from "lucide-react";

const PAGE_SIZE = 25;

export function AdminUsersPanel() {
  const t = useTranslations("admin.users");
  const common = useTranslations("common");
  const locale = useLocale() as Locale;
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (search) params.set("q", search);

    const response = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
    if (response.ok) {
      const data = (await response.json()) as {
        users: AdminUserRow[];
        total: number;
      };
      setUsers(data.users);
      setTotal(data.total);
    }
    setLoading(false);
  }, [offset, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setOffset(0);
    setSearch(query.trim());
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="kk-input pl-10"
          />
        </div>
        <button type="submit" className="kk-btn-secondary shrink-0">
          {t("search")}
        </button>
      </form>

      {loading ? (
        <p className="text-zinc-500">{common("loading")}</p>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <>
          <p className="text-sm text-zinc-500">{t("resultCount", { count: total })}</p>
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{displayName(user)}</p>
                  <p className="text-sm text-zinc-500">
                    {user.username ? `@${user.username}` : user.id}
                    {" · "}
                    {t("joined", {
                      date: new Date(user.created_at).toLocaleDateString(intlLocale(locale), {
                        dateStyle: "medium",
                      }),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <span>{t("eventsCount", { count: user.event_count })}</span>
                  <span>{t("listingsCount", { count: user.listing_count })}</span>
                  <span className="uppercase">{user.language_code}</span>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                className="kk-btn-secondary"
              >
                {t("prevPage")}
              </button>
              <p className="text-sm text-zinc-500">
                {t("pageOf", { page, total: totalPages })}
              </p>
              <button
                type="button"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset((value) => value + PAGE_SIZE)}
                className="kk-btn-secondary"
              >
                {t("nextPage")}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
