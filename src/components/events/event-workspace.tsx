"use client";

import { CalendarDays, LayoutGrid, MapPin, MessageSquare, Pencil, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { cacheEventDetail, getCachedEventDetail } from "@/lib/offline/event-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { ActivityTimelinePanel } from "@/components/events/activity-timeline-panel";
import { EventCoverImage } from "@/components/events/event-cover-image";
import { CommentThread } from "@/components/events/comment-thread";
import { ExpensePanel } from "@/components/events/expense-panel";
import { InvitePanel } from "@/components/events/invite-panel";
import { PaymentModeBadge } from "@/components/events/payment-mode-badge";
import { NotificationPreferencesPanel } from "@/components/events/notification-preferences-panel";
import { PaidEventSummaryPanel } from "@/components/events/paid-event-summary-panel";
import { PayoutMethodPanel } from "@/components/events/payout-method-panel";
import { ReferralSummaryPanel } from "@/components/events/referral-summary-panel";
import { RsvpSummaryPanel } from "@/components/events/rsvp-summary-panel";
import { RsvpStatusPanel } from "@/components/events/rsvp-status-panel";
import { LeaveEventButton } from "@/components/events/leave-event-button";
import { MemberList } from "@/components/events/member-list";
import { TransferOwnershipPanel } from "@/components/events/transfer-ownership-panel";
import { TelegramGroupPanel } from "@/components/events/telegram-group-panel";
import { TelegramNotifyBanner } from "@/components/events/telegram-notify-banner";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/lib/locale";
import { displayName } from "@/lib/utils";
import type {
  Comment,
  Event,
  EventMember,
  EventPaymentSummary,
  EventRsvpStatus,
  Expense,
  Settlement,
} from "@/types";
type EventPayload = {
  event: Event;
  members: EventMember[];
  comments: Comment[];
  expenses: Expense[];
  settlements: Settlement[];
  paymentSummaries: EventPaymentSummary[];
};

const tabs = ["overview", "comments", "expenses"] as const;
type EventTab = (typeof tabs)[number];

const tabIcons: Record<EventTab, typeof LayoutGrid> = {
  overview: LayoutGrid,
  comments: MessageSquare,
  expenses: Receipt,
};

export function EventWorkspace({
  eventId,
  locale,
  initialData,
  botUsername,
  canEdit = false,
  canLeave = false,
  showNotifyBanner = false,
  currentUserId,
}: {
  eventId: string;
  locale: string;
  initialData: EventPayload;
  botUsername: string;
  canEdit?: boolean;
  canLeave?: boolean;
  showNotifyBanner?: boolean;
  currentUserId: string;
}) {
  const t = useTranslations("events");
  const common = useTranslations("common");
  const online = useOnlineStatus();
  const [tab, setTab] = useState<EventTab>("overview");
  const [data, setData] = useState<EventPayload>(initialData);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  useEffect(() => {
    cacheEventDetail(eventId, initialData);
  }, [eventId, initialData]);

  useEffect(() => {
    if (online) return;

    const cached = getCachedEventDetail<EventPayload>(eventId);
    if (cached) {
      setData(cached.data);
      setCachedAt(cached.cachedAt);
    }
  }, [online, eventId]);

  const usingCache = !online && cachedAt !== null;

  const load = useCallback(async () => {
    if (!online) return;

    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const next = (await response.json()) as EventPayload;
        setData(next);
        cacheEventDetail(eventId, next);
        setCachedAt(null);
      }
    } catch {
      const cached = getCachedEventDetail<EventPayload>(eventId);
      if (cached) {
        setData(cached.data);
        setCachedAt(cached.cachedAt);
      }
    }
  }, [eventId, online]);

  const { event, members, comments, expenses, settlements, paymentSummaries } = data;
  const startsAt = new Date(event.starts_at);
  const owner = members.find((member) => member.role === "owner");
  const currentMember = members.find((member) => member.id === currentUserId);
  const currentRsvpStatus: EventRsvpStatus = currentMember?.rsvp_status ?? "going";
  const creatorName = owner ? displayName(owner) : null;

  function renderTabContent() {
    if (tab === "overview") {
      return (
        <div className="space-y-4">
          {showNotifyBanner ? <TelegramNotifyBanner botUsername={botUsername} /> : null}
          <RsvpSummaryPanel members={members} />
          <ActivityTimelinePanel
            eventId={eventId}
            members={members}
            comments={comments}
            expenses={expenses}
            locale={locale}
            canPostToGroup={canEdit && Boolean(event.telegram_chat_id)}
          />
          <RsvpStatusPanel
            eventId={eventId}
            initialStatus={currentRsvpStatus}
            onChanged={load}
            readOnly={!online}
          />
          <NotificationPreferencesPanel eventId={eventId} />
          {event.invite_code ? (
            <InvitePanel
              eventId={eventId}
              eventTitle={event.title}
              inviteCode={event.invite_code}
              botUsername={botUsername}
              locale={locale}
              currentUserId={currentUserId}
              canRegenerate={canEdit}
            />
          ) : null}
          {canEdit && event.invite_code ? (
            <TelegramGroupPanel
              eventId={eventId}
              inviteCode={event.invite_code}
              botUsername={botUsername}
              linked={Boolean(event.telegram_chat_id)}
            />
          ) : null}
          {canEdit ? <ReferralSummaryPanel members={members} /> : null}
          {canEdit && event.payment_mode === "paid" ? (
            <PaidEventSummaryPanel
              members={members}
              paymentSummaries={paymentSummaries}
              ticketPriceCents={event.ticket_price_cents}
              ticketCurrency={event.ticket_currency}
              locale={locale}
            />
          ) : null}
          {canEdit && event.payment_mode === "paid" ? <PayoutMethodPanel /> : null}
          <section className="kk-card p-5 sm:p-6">
            <h2 className="kk-section-title">{t("detailTitle")}</h2>
            <MemberList
              eventId={eventId}
              members={members}
              paymentMode={event.payment_mode ?? "free"}
              paymentSummaries={paymentSummaries}
              ticketPriceCents={event.ticket_price_cents}
              ticketCurrency={event.ticket_currency}
              locale={locale}
              currentUserId={currentUserId}
              canManage={canEdit}
              onChanged={load}
            />
          </section>
          {canEdit ? (
            <TransferOwnershipPanel
              eventId={eventId}
              members={members}
              currentUserId={currentUserId}
            />
          ) : null}
          {canLeave ? (
            <section className="kk-card p-5 sm:p-6">
              <LeaveEventButton eventId={eventId} />
            </section>
          ) : null}
        </div>
      );
    }

    if (tab === "comments") {
      return (
        <CommentThread
          eventId={eventId}
          comments={comments}
          currentUserId={currentUserId}
          onPosted={load}
          readOnly={!online}
        />
      );
    }

    return (
      <ExpensePanel
        key={members.map((member) => member.id).join("-")}
        eventId={eventId}
        members={members}
        expenses={expenses}
        settlements={settlements}
        locale={locale}
        currency={event.expense_currency ?? "UZS"}
        onAdded={load}
        readOnly={!online}
      />
    );
  }

  return (
    <div className="pb-safe-nav sm:pb-0">
      <div className="space-y-5 sm:space-y-6">
        {!online || usingCache ? (
          <OfflineBanner cachedAt={usingCache ? (cachedAt ?? undefined) : undefined} />
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="aspect-[4/3] overflow-hidden sm:aspect-[21/9]">
            <EventCoverImage
              event={event}
              locale={locale}
              creatorName={creatorName}
              variant="hero"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-4 p-5 sm:p-6">
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{event.title}</h1>
              <PaymentModeBadge mode={event.payment_mode ?? "free"} size="sm" />
              {event.description ? (
                <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {event.description}
                </p>
              ) : null}
            </div>

            {canEdit ? (
              <Link href={`/events/${eventId}/edit`} className="kk-btn-secondary w-full sm:w-auto">
                <Pencil className="h-4 w-4" />
                {common("edit")}
              </Link>
            ) : null}

            <div className="space-y-2 text-base text-zinc-600 dark:text-zinc-300">
              <p className="inline-flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" />
                {startsAt.toLocaleString(intlLocale(locale as Locale), {
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
            </div>

            {event.location_lat && event.location_lng ? (
              <iframe
                title={event.location_name ?? "Map"}
                className="h-48 w-full rounded-2xl border border-zinc-200 sm:h-56 dark:border-zinc-700"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${event.location_lat},${event.location_lng}&z=15&output=embed`}
              />
            ) : null}
          </div>
        </section>

        {/* Desktop tabs */}
        <div className="hidden flex-wrap gap-2 sm:flex">
          {tabs.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={tab === value ? "kk-chip-active" : "kk-chip-inactive"}
            >
              {t(`tabs.${value}`)}
            </button>
          ))}
        </div>

        {renderTabContent()}
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Event sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/90 bg-white/95 pb-safe backdrop-blur-md sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-3 gap-1 px-2 py-2">
          {tabs.map((value) => {
            const Icon = tabIcons[value];
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-medium transition active:scale-[0.98] ${
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "text-zinc-500"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                {t(`tabs.${value}`)}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
