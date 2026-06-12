"use client";

import { CalendarDays, MapPin, MessageSquare, Pencil, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { cacheEventDetail, getCachedEventDetail } from "@/lib/offline/event-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { ActivityTimelinePanel } from "@/components/events/activity-timeline-panel";
import { EventCoverImage } from "@/components/events/event-cover-image";
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

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
  const startsAt = new Date(event.starts_at);
  const owner = members.find((member) => member.role === "owner");
  const currentMember = members.find((member) => member.id === currentUserId);
  const currentRsvpStatus: EventRsvpStatus = currentMember?.rsvp_status ?? "going";
  const creatorName = owner ? displayName(owner) : null;

  function renderOverview() {
    return (
      <div className="space-y-4">
        {showNotifyBanner ? <TelegramNotifyBanner botUsername={botUsername} /> : null}
        <RsvpSummaryPanel members={members} />
        {canEdit ? (
          <HostChecklistPanel
            locale={locale}
            currentUserId={currentUserId}
            event={event}
            members={members}
            comments={comments}
            expenses={expenses}
            paymentSummaries={paymentSummaries}
          />
        ) : null}
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
        <section id="event-members" className="kk-card scroll-mt-24 p-5 sm:p-6">
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

  return (
    <div>
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

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => scrollToSection("event-comments")}
            className="kk-card flex min-h-[5.5rem] flex-col items-start gap-2 p-4 text-left transition active:scale-[0.99] sm:min-h-0 sm:p-5 sm:hover:border-emerald-200 sm:hover:shadow-md dark:sm:hover:border-emerald-900"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <MessageSquare className="h-5 w-5" />
              {t("tabs.comments")}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("sectionNav.commentsHint")}
            </span>
            <span className="mt-auto text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {t("sectionNav.commentsCount", { count: comments.length })}
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("event-expenses")}
            className="kk-card flex min-h-[5.5rem] flex-col items-start gap-2 p-4 text-left transition active:scale-[0.99] sm:min-h-0 sm:p-5 sm:hover:border-emerald-200 sm:hover:shadow-md dark:sm:hover:border-emerald-900"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <Receipt className="h-5 w-5" />
              {t("tabs.expenses")}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("sectionNav.expensesHint")}
            </span>
            <span className="mt-auto text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {t("sectionNav.expensesCount", { count: expenses.length })}
            </span>
          </button>
        </div>

        <section id="event-comments" className="scroll-mt-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950/50">
              <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">{t("comments.title")}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("sectionNav.commentsHint")}
              </p>
            </div>
          </div>
          <CommentThread
            eventId={eventId}
            comments={comments}
            currentUserId={currentUserId}
            onPosted={load}
            readOnly={!online}
          />
        </section>

        <section id="event-expenses" className="scroll-mt-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950/50">
              <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">{t("expenses.title")}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t("sectionNav.expensesHint")}
              </p>
            </div>
          </div>
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
        </section>

        {renderOverview()}
      </div>
    </div>
  );
}
