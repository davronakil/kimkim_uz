"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import type { AdminEventRow } from "@/lib/db/admin-queries";
import { intlLocale } from "@/lib/locale";
import type { Locale } from "@/i18n/config";
import { displayName } from "@/lib/utils";
import { CalendarRange, ExternalLink, Search } from "lucide-react";

const PAGE_SIZE = 25;

export function AdminEventsPanel() {
  const t = useTranslations("admin.events");
  const common = useTranslations("common");
  const locale = useLocale() as Locale;
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      visibility,
    });
    if (search) params.set("q", search);

    const response = await fetch(`/api/admin/events?${params}`, { credentials: "include" });
    if (response.ok) {
      const data = (await response.json()) as {
        events: AdminEventRow[];
        total: number;
      };
      setEvents(data.events);
      setTotal(data.total);
    }
    setLoading(false);
  }, [offset, search, visibility]);

  useEffect(() => {
    void load();
  }, [load]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setOffset(0);
    setSearch(query.trim());
  }

  async function toggleVisibility(event: AdminEventRow) {
    const next = event.visibility === "public" ? "private" : "public";
    setBusyId(event.id);
    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (response.ok) {
        setEvents((items) =>
          items.map((item) => (item.id === event.id ? { ...item, visibility: next } : item)),
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "public", "private"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setOffset(0);
              setVisibility(value);
            }}
            className={visibility === value ? "kk-chip-active" : "kk-chip-inactive"}
          >
            {t(`filter.${value}`)}
          </button>
        ))}
      </div>

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
      ) : events.length === 0 ? (
        <EmptyState icon={CalendarRange} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <>
          <p className="text-sm text-zinc-500">{t("resultCount", { count: total })}</p>
          <ul className="space-y-3">
            {events.map((event) => {
              const creatorName = displayName({
                first_name: event.creator_first_name,
                last_name: event.creator_last_name,
                username: event.creator_username,
              });
              const startsAt = new Date(event.starts_at);

              return (
                <li
                  key={event.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            event.visibility === "public"
                              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {event.visibility === "public" ? t("public") : t("private")}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {startsAt.toLocaleString(intlLocale(locale), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {event.location_name ? ` · ${event.location_name}` : ""}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {t("byCreator", { name: creatorName })}
                        {" · "}
                        {t("membersCount", { count: event.member_count })}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/events/${event.id}`} className="kk-btn-secondary">
                        <ExternalLink className="h-4 w-4" />
                        {t("open")}
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === event.id}
                        onClick={() => void toggleVisibility(event)}
                        className="kk-btn-secondary"
                      >
                        {event.visibility === "public" ? t("makePrivate") : t("makePublic")}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
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
