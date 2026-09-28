"use client";

import { CalendarDays, MapPin, Pencil, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { cacheEventDetail, getCachedEventDetail } from "@/lib/offline/event-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { ActivityTimelinePanel } from "@/components/events/activity-timeline-panel";
import { EventCoverImage } from "@/components/events/event-cover-image";
import { FormattedEventDescription } from "@/components/events/formatted-event-description";
import { CommentThread } from "@/components/events/comment-thread";
import { HostChecklistPanel } from "@/components/events/host-checklist-panel";
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
import { goingHeadcount } from "@/lib/events/headcount";
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
  const expensesEnabled = event.expenses_enabled;
  const visibleExpenses = expensesEnabled ? expenses : [];
  const visibleSettlements = expensesEnabled ? settlements : [];
  const startsAt = new Date(event.starts_at);
  const owner = members.find((member) => member.role === "owner");
  const currentMember = members.find((member) => member.id === currentUserId);
  const currentRsvpStatus: EventRsvpStatus = currentMember?.rsvp_status ?? "going";
  const currentAdditionalGuestCount = currentMember?.additional_guest_count ?? 0;
  const creatorName = owner ? displayName(owner) : null;
  const goingCount = goingHeadcount(members);

  function renderGuests() {
    return (
      <section id="event-members" className="kk-card scroll-mt-6 space-y-4 p-4 sm:p-5">
        <h2 className="text-lg font-semibold">{t("detailTitle")}</h2>
        <RsvpSummaryPanel members={members} />
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
    );
  }

  function renderMore() {
    return (
      <details className="kk-card group p-4 sm:p-5">
        <summary className="cursor-pointer list-none text-sm font-medium text-zinc-700 marker:content-none dark:text-zinc-200">
          <span className="inline-flex items-center gap-2">
            {t("moreTitle")}
            <span className="text-xs font-normal text-zinc-400 group-open:hidden">{t("moreHint")}</span>
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          <NotificationPreferencesPanel eventId={eventId} />
          {canEdit ? (
            <HostChecklistPanel
              locale={locale}
              currentUserId={currentUserId}
              event={event}
              members={members}
              comments={comments}
              expenses={visibleExpenses}
              paymentSummaries={paymentSummaries}
            />
          ) : null}
          <ActivityTimelinePanel
            eventId={eventId}
            members={members}
            comments={comments}
            expenses={visibleExpenses}
            locale={locale}
            canPostToGroup={canEdit && Boolean(event.telegram_chat_id)}
          />
          {canEdit && event.invite_code ? (
            <TelegramGroupPanel
              eventId={eventId}
              inviteCode={event.invite_code}
              botUsername={botUsername}
              linked={Boolean(event.telegram_chat_id)}
              topicName={event.telegram_topic_name}
              topicLinked={event.telegram_message_thread_id != null}
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
          {canEdit ? (
            <TransferOwnershipPanel
              eventId={eventId}
              members={members}
              currentUserId={currentUserId}
            />
          ) : null}
          {canLeave ? <LeaveEventButton eventId={eventId} /> : null}
        </div>
      </details>
    );
  }

  return (
    <div>
      <div className="space-y-5 sm:space-y-6">
        {!online || usingCache ? (
          <OfflineBanner cachedAt={usingCache ? (cachedAt ?? undefined) : undefined} />
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="aspect-[2/1] overflow-hidden sm:aspect-[21/8]">
            <EventCoverImage
              event={event}
              locale={locale}
              creatorName={creatorName}
              variant="hero"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{event.title}</h1>
                <PaymentModeBadge mode={event.payment_mode ?? "free"} size="sm" />
              </div>
              {canEdit ? (
                <Link href={`/events/${eventId}/edit`} className="kk-btn-secondary shrink-0 px-3">
                  <Pencil className="h-4 w-4" />
                  {common("edit")}
                </Link>
              ) : null}
            </div>

            {event.description ? (
              <FormattedEventDescription
                text={event.description}
                className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-600 dark:text-zinc-300"
              />
            ) : null}

            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <p className="inline-flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                {startsAt.toLocaleString(intlLocale(locale as Locale), {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
              {event.location_name ? (
                <p className="inline-flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {event.location_name}
                </p>
              ) : null}
              <p className="inline-flex items-start gap-2.5">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                {t("public.memberCount", { count: goingCount })}
              </p>
            </div>

            {event.location_lat && event.location_lng ? (
              <iframe
                title={event.location_name ?? "Map"}
                className="h-36 w-full rounded-2xl border border-zinc-200 dark:border-zinc-700"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${event.location_lat},${event.location_lng}&z=15&output=embed`}
              />
            ) : null}
          </div>
        </section>

        {showNotifyBanner ? <TelegramNotifyBanner botUsername={botUsername} /> : null}

        <RsvpStatusPanel
          eventId={eventId}
          initialStatus={currentRsvpStatus}
          initialAdditionalGuestCount={currentAdditionalGuestCount}
          onChanged={load}
          readOnly={!online}
        />

        {renderGuests()}

        {expensesEnabled ? (
          <section id="event-expenses" className="scroll-mt-6 space-y-3">
            <h2 className="text-lg font-semibold">{t("expenses.title")}</h2>
            <ExpensePanel
              key={members
                .map((member) => `${member.id}:${member.additional_guest_count ?? 0}`)
                .join("-")}
              eventId={eventId}
              members={members}
              expenses={visibleExpenses}
              settlements={visibleSettlements}
              locale={locale}
              currency={event.expense_currency ?? "UZS"}
              onAdded={load}
              readOnly={!online}
            />
          </section>
        ) : null}

        <section id="event-comments" className="scroll-mt-6 space-y-3">
          <h2 className="text-lg font-semibold">{t("comments.title")}</h2>
          <CommentThread
            eventId={eventId}
            comments={comments}
            currentUserId={currentUserId}
            onPosted={load}
            readOnly={!online}
          />
        </section>

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

        {renderMore()}
      </div>
    </div>
  );
}
