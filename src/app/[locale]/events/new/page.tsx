import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreateEventForm } from "@/components/events/create-event-form";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { buildSitePageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [events, meta] = await Promise.all([
    getTranslations({ locale, namespace: "events" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/events/new`,
    title: events("newTitle"),
    description: meta("description"),
    ogTitle: meta("ogTitle"),
  });
}

export default async function NewEventPage({
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="kk-page-title">{t("newTitle")}</h1>
      <CreateEventForm />
    </div>
  );
}
