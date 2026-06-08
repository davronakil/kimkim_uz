import { CalendarPlus, CalendarRange } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventCard } from "@/components/events/event-card";
import { EventsOnboarding } from "@/components/onboarding/events-onboarding";
import { EmptyState } from "@/components/ui/empty-state";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listUserEvents } from "@/lib/db/queries";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  const t = await getTranslations("events");
  const common = await getTranslations("common");
  const events = await listUserEvents(user.id);
  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
    process.env.TELEGRAM_BOT_USERNAME ??
    "kimkimuzbot";
  const now = Date.now();
  const upcoming = events.filter((event) => new Date(event.starts_at).getTime() >= now);
  const past = events
    .filter((event) => new Date(event.starts_at).getTime() < now)
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="kk-page-title">{t("title")}</h1>
        <Link href="/events/new" className="kk-btn-primary w-full sm:w-auto">
          <CalendarPlus className="h-4 w-4" />
          {common("createEvent")}
        </Link>
      </div>

      <EventsOnboarding botUsername={botUsername} eventCount={events.length} />

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title={t("emptyTitle")}
          description={common("noEvents")}
        >
          <Link href="/events/new" className="kk-btn-primary w-full sm:w-auto">
            {common("createEvent")}
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
              {t("upcomingTitle")}
            </h2>
            {upcoming.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} locale={locale} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarPlus}
                title={t("noUpcomingTitle")}
                description={t("noUpcomingBody")}
              >
                <Link href="/events/new" className="kk-btn-primary w-full sm:w-auto">
                  {common("createEvent")}
                </Link>
              </EmptyState>
            )}
          </section>

          {past.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
                {t("pastTitle")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} locale={locale} past />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
