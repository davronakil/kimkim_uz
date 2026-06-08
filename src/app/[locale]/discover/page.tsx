import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listPublicEvents } from "@/lib/db/queries";
import { partitionEventsByDate } from "@/lib/events/partition-by-date";
import { buildSitePageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const discover = await getTranslations({ locale, namespace: "discover" });

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/discover`,
    title: discover("title"),
    description: discover("metaDescription"),
    ogTitle: discover("title"),
  });
}

export default async function DiscoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("discover");
  const common = await getTranslations("common");
  const events = await getTranslations("events");
  const user = await getCurrentUser();
  const publicEvents = await listPublicEvents();
  const { upcoming, past } = partitionEventsByDate(publicEvents);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="kk-page-title">{t("title")}</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">{t("subtitle")}</p>
        </div>
        {user ? (
          <Link href="/events/new" className="kk-btn-primary w-full sm:w-auto">
            {common("createEvent")}
          </Link>
        ) : (
          <Link href="/login" className="kk-btn-primary w-full sm:w-auto">
            {common("signIn")}
          </Link>
        )}
      </div>

      {publicEvents.length === 0 ? (
        <EmptyState icon={CalendarRange} title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
              {events("upcomingTitle")}
            </h2>
            {upcoming.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} locale={locale} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">{t("noUpcoming")}</p>
            )}
          </section>

          {past.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
                {events("pastTitle")}
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
