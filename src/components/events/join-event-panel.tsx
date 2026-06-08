"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { useRouter } from "@/i18n/navigation";
import type { Event } from "@/types";

type JoinPreview = {
  event: Pick<
    Event,
    "id" | "title" | "description" | "starts_at" | "location_name" | "invite_code"
  >;
  member_count: number;
  joined: boolean;
};

export function JoinEventPanel({
  code,
  botUsername,
  locale,
}: {
  code: string;
  botUsername: string;
  locale: string;
}) {
  const t = useTranslations("join");
  const router = useRouter();
  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/events/join?code=${encodeURIComponent(code)}`, {
        credentials: "include",
      });
      if (response.ok) {
        setPreview(await response.json());
      }
      setLoading(false);
    }
    void load();

    const onAuthChange = () => {
      void load();
    };
    window.addEventListener("kimkim:auth-change", onAuthChange);
    return () => window.removeEventListener("kimkim:auth-change", onAuthChange);
  }, [code]);

  async function join() {
    setJoining(true);
    const response = await fetch("/api/events/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    });

    if (response.status === 401) {
      setNeedsLogin(true);
      setJoining(false);
      return;
    }

    if (response.ok) {
      const data = (await response.json()) as { event_id: string };
      window.dispatchEvent(new Event("kimkim:auth-change"));
      router.push(`/events/${data.event_id}`);
      router.refresh();
    }
    setJoining(false);
  }

  if (loading) {
    return <p className="text-base text-zinc-500">{t("loading")}</p>;
  }

  if (!preview) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-base text-zinc-500 sm:p-8">
        {t("notFound")}
      </p>
    );
  }

  const { event, member_count, joined } = preview;
  const startsAt = new Date(event.starts_at);
  const loginRedirect = `/join/${code}`;

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
          {t("eyebrow")}
        </p>
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{event.title}</h1>
        {event.description ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{event.description}</p>
        ) : null}
      </div>

      <div className="space-y-3 text-base text-zinc-600 dark:text-zinc-300">
        <p className="inline-flex items-start gap-2.5">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" />
          {startsAt.toLocaleString(locale === "uz" ? "uz-UZ" : "en-US", {
            dateStyle: "full",
            timeStyle: "short",
          })}
        </p>
        {event.location_name ? (
          <p className="inline-flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
            {event.location_name}
          </p>
        ) : null}
        <p className="inline-flex items-start gap-2.5">
          <Users className="mt-0.5 h-5 w-5 shrink-0" />
          {t("memberCount", { count: member_count })}
        </p>
      </div>

      {joined ? (
        <button
          type="button"
          onClick={() => router.push(`/events/${event.id}`)}
          className="kk-btn-primary w-full"
        >
          {t("openEvent")}
        </button>
      ) : needsLogin ? (
        <div className="space-y-4">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">{t("loginToJoin")}</p>
          <TelegramLoginButton botUsername={botUsername} redirectTo={loginRedirect} />
        </div>
      ) : (
        <button
          type="button"
          disabled={joining}
          onClick={() => void join()}
          className="kk-btn-primary w-full disabled:opacity-60"
        >
          {joining ? t("joining") : t("join")}
        </button>
      )}
    </div>
  );
}
