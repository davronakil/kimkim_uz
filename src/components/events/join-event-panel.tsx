"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, MapPin, Sparkles, Users } from "lucide-react";
import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { EventCoverImage } from "@/components/events/event-cover-image";
import { PaymentModeBadge } from "@/components/events/payment-mode-badge";
import type { Locale } from "@/i18n/config";
import { useRouter } from "@/i18n/navigation";
import { intlLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/utils";
import type { Event, EventPaymentMode, EventRsvpStatus } from "@/types";

type JoinPreview = {
  event: Pick<
    Event,
    | "id"
    | "title"
    | "description"
    | "starts_at"
    | "location_name"
    | "cover_image_key"
    | "payment_mode"
    | "ticket_price_cents"
    | "ticket_currency"
    | "invite_code"
  >;
  creator_name: string | null;
  member_count: number;
  joined: boolean;
  logged_in: boolean;
  payments_enabled: boolean;
  has_paid: boolean;
  rsvp_status: EventRsvpStatus | null;
};

function showsExpenseNote(mode: EventPaymentMode) {
  return mode === "split" || mode === "pay_yourself";
}

function isPaidEvent(preview: JoinPreview) {
  return preview.event.payment_mode === "paid";
}

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
  const searchParams = useSearchParams();
  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [paying, setPaying] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [rsvpMessage, setRsvpMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/events/join?code=${encodeURIComponent(code)}`, {
      credentials: "include",
    });
    if (response.ok) {
      setPreview(await response.json());
    } else {
      setPreview(null);
    }
    setLoading(false);
  }, [code]);

  useEffect(() => {
    void load();

    const onAuthChange = () => {
      void load();
    };
    window.addEventListener("kimkim:auth-change", onAuthChange);
    return () => window.removeEventListener("kimkim:auth-change", onAuthChange);
  }, [load]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const cancelled = searchParams.get("checkout") === "cancelled";

    if (cancelled) {
      setCheckoutMessage(t("checkoutCancelled"));
      return;
    }

    if (!sessionId) return;

    async function confirmCheckout() {
      setCheckoutMessage(t("confirmingPayment"));
      const response = await fetch(
        `/api/events/join/checkout?session_id=${encodeURIComponent(sessionId!)}`,
        { credentials: "include" },
      );

      if (response.ok) {
        const data = (await response.json()) as { joined?: boolean; eventId?: string };
        if (data.joined && data.eventId) {
          setCheckoutMessage(t("paymentSuccess"));
          router.replace(`/join/${code}`);
          router.push(`/events/${data.eventId}`);
          router.refresh();
          return;
        }
      }

      setCheckoutMessage(t("paymentPending"));
      void load();
    }

    void confirmCheckout();
  }, [code, load, router, searchParams, t]);

  async function join(payLater = false, rsvpStatus: EventRsvpStatus = "going") {
    setJoining(true);
    setRsvpMessage(null);
    const response = await fetch("/api/events/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code, pay_later: payLater, rsvp_status: rsvpStatus }),
    });

    if (response.ok) {
      const data = (await response.json()) as { event_id: string; joined?: boolean };
      window.dispatchEvent(new Event("kimkim:auth-change"));
      if (rsvpStatus === "declined" || data.joined === false) {
        setRsvpMessage(t("declinedSaved"));
        void load();
        setJoining(false);
        return;
      }
      router.push(`/events/${data.event_id}`);
      router.refresh();
    }
    setJoining(false);
  }

  async function startCheckout() {
    setPaying(true);
    setCheckoutMessage(null);

    const response = await fetch(`/api/events/join/checkout?locale=${locale}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    });

    if (response.ok) {
      const data = (await response.json()) as { url: string };
      window.location.href = data.url;
      return;
    }

    setCheckoutMessage(t("checkoutError"));
    setPaying(false);
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center">
        <p className="text-base text-zinc-500">{t("loading")}</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-base text-zinc-500">{t("notFound")}</p>
      </div>
    );
  }

  const { event, member_count, joined, logged_in, payments_enabled, rsvp_status, creator_name } =
    preview;
  const paymentMode = event.payment_mode ?? "free";
  const startsAt = new Date(event.starts_at);
  const loginRedirect = `/join/${code}`;
  const ticketLabel =
    event.ticket_price_cents && event.ticket_price_cents > 0
      ? formatMoney(event.ticket_price_cents, event.ticket_currency ?? "UZS", locale)
      : null;
  const requiresPayment = isPaidEvent(preview) && payments_enabled;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative aspect-[4/3] overflow-hidden">
          <EventCoverImage
            event={event}
            locale={locale}
            creatorName={creator_name}
            variant="hero"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
            <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-emerald-200">
              <Sparkles className="h-4 w-4" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{event.title}</h1>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{t("headline")}</h2>
            <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-300">{t("intro")}</p>
          </div>

          <PaymentModeBadge mode={paymentMode} showHint />

          {ticketLabel ? (
            <p className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-base font-semibold text-violet-950 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-100">
              {t("ticketPrice", { price: ticketLabel })}
            </p>
          ) : null}

          {event.description ? (
            <p className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-base leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              {event.description}
            </p>
          ) : null}

          <div className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <p className="inline-flex w-full items-start gap-3 text-base text-zinc-700 dark:text-zinc-200">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {startsAt.toLocaleString(intlLocale(locale as Locale), {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
            {event.location_name ? (
              <p className="inline-flex w-full items-start gap-3 text-base text-zinc-700 dark:text-zinc-200">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                {event.location_name}
              </p>
            ) : null}
            <p className="inline-flex w-full items-start gap-3 text-base text-zinc-700 dark:text-zinc-200">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {t("memberCount", { count: member_count })}
            </p>
          </div>

          {showsExpenseNote(paymentMode) ? (
            <p className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
              {t("expensesNote")}
            </p>
          ) : null}

          {paymentMode === "paid" && !payments_enabled ? (
            <p className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-relaxed text-violet-950 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-100">
              {t("paidNotConfigured")}
            </p>
          ) : null}

          {paymentMode === "paid" && payments_enabled ? (
            <p className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-relaxed text-violet-950 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-100">
              {t("paidNote")}
            </p>
          ) : null}

          {checkoutMessage ? (
            <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              {checkoutMessage}
            </p>
          ) : null}

          {rsvpMessage || rsvp_status === "declined" ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              {rsvpMessage ?? t("declinedCurrent")}
            </p>
          ) : null}

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
            {joined ? (
              <div className="space-y-4 text-center">
                <p className="text-base font-medium text-emerald-800 dark:text-emerald-200">
                  {t("alreadyJoined")}
                </p>
                <button type="button" onClick={() => router.push(`/events/${event.id}`)} className="kk-btn-primary w-full">
                  {t("openEvent")}
                </button>
              </div>
            ) : !logged_in ? (
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <p className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">
                    {t("loginTitle")}
                  </p>
                  <p className="text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">
                    {requiresPayment ? t("loginBodyPaid") : t("loginBody")}
                  </p>
                </div>
                <TelegramLoginButton botUsername={botUsername} redirectTo={loginRedirect} />
              </div>
            ) : requiresPayment ? (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={paying || joining}
                  onClick={() => void startCheckout()}
                  className="kk-btn-primary w-full disabled:opacity-60"
                >
                  {paying
                    ? t("startingCheckout")
                    : t("payAndJoin", { price: ticketLabel ?? "" })}
                </button>
                <button
                  type="button"
                  disabled={joining || paying}
                  onClick={() => void join(true, "going")}
                  className="w-full rounded-full border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
                >
                  {joining ? t("joining") : t("joinPayLater")}
                </button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={joining || paying}
                    onClick={() => void join(true, "maybe")}
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    {t("maybe")}
                  </button>
                  <button
                    type="button"
                    disabled={joining || paying}
                    onClick={() => void join(false, "declined")}
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    {t("cantGo")}
                  </button>
                </div>
                <p className="text-center text-xs leading-relaxed text-emerald-900/75 dark:text-emerald-100/70">
                  {t("payLaterNote")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={joining}
                  onClick={() => void join(false, "going")}
                  className="kk-btn-primary w-full disabled:opacity-60"
                >
                  {joining ? t("joining") : t("join")}
                </button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={joining}
                    onClick={() => void join(false, "maybe")}
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    {t("maybe")}
                  </button>
                  <button
                    type="button"
                    disabled={joining}
                    onClick={() => void join(false, "declined")}
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    {t("cantGo")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
