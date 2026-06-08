"use client";

import { CalendarDays, MapPin, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { EventCoverImage } from "@/components/events/event-cover-image";
import { PaymentModeBadge } from "@/components/events/payment-mode-badge";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/lib/locale";
import { formatMoney } from "@/lib/utils";
import type { Event } from "@/types";

type PublicEvent = Pick<
  Event,
  | "id"
  | "title"
  | "description"
  | "starts_at"
  | "location_name"
  | "location_address"
  | "cover_image_key"
  | "payment_mode"
  | "ticket_price_cents"
  | "ticket_currency"
  | "invite_code"
>;

export function PublicEventOverview({
  event,
  locale,
  memberCount,
  loggedIn,
}: {
  event: PublicEvent;
  locale: string;
  memberCount: number;
  loggedIn: boolean;
}) {
  const t = useTranslations("events.public");
  const startsAt = new Date(event.starts_at);
  const paymentMode = event.payment_mode ?? "free";
  const ticketLabel =
    event.ticket_price_cents && event.ticket_price_cents > 0
      ? formatMoney(event.ticket_price_cents, event.ticket_currency ?? "UZS", locale)
      : null;

  return (
    <div className="mx-auto max-w-5xl py-6 sm:py-10">
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[22rem] overflow-hidden lg:min-h-[34rem]">
            <EventCoverImage
              event={event}
              locale={locale}
              variant="hero"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
                {t("eyebrow")}
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">
                {event.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 p-5 sm:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {t("title")}
                </h2>
                <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {t(loggedIn ? "bodyLoggedIn" : "bodyLoggedOut")}
                </p>
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
                <p className="flex items-start gap-3 text-base text-zinc-700 dark:text-zinc-200">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {startsAt.toLocaleString(intlLocale(locale as Locale), {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </p>
                {event.location_name ? (
                  <p className="flex items-start gap-3 text-base text-zinc-700 dark:text-zinc-200">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {event.location_name}
                      {event.location_address ? (
                        <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                          {event.location_address}
                        </span>
                      ) : null}
                    </span>
                  </p>
                ) : null}
                <p className="flex items-start gap-3 text-base text-zinc-700 dark:text-zinc-200">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {t("memberCount", { count: memberCount })}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-sm leading-relaxed text-emerald-950/80 dark:text-emerald-100/80">
                {t("ctaBody")}
              </p>
              <Link href={`/join/${event.invite_code}`} className="kk-btn-primary w-full">
                {t(loggedIn ? "joinAction" : "signInAction")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
