import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventById, isEventOwner } from "@/lib/db/queries";
import { buildSitePageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const [events, meta] = await Promise.all([
    getTranslations({ locale, namespace: "events" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/events/${id}/edit`,
    title: events("editTitle"),
    description: meta("description"),
    ogTitle: meta("ogTitle"),
    robots: {
      index: false,
      follow: false,
    },
  });
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  const event = await getEventById(id);
  if (!event) notFound();

  const owner = await isEventOwner(id, user.id);
  if (!owner) notFound();

  const t = await getTranslations("events");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="kk-page-title">{t("editTitle")}</h1>
      <EventForm mode="edit" event={event} cancelHref={`/events/${id}`} />
    </div>
  );
}
