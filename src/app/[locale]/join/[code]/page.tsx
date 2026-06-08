import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { JoinEventPanel } from "@/components/events/join-event-panel";
import { getEventByInviteCode } from "@/lib/db/queries";
import { buildEventShareMetadata } from "@/lib/event-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const event = await getEventByInviteCode(code);

  if (!event) {
    const t = await getTranslations({ locale, namespace: "join" });
    return { title: t("notFound") };
  }

  return buildEventShareMetadata(event, locale, `/${locale}/join/${code}`);
}

export default async function JoinEventPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);

  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
    process.env.TELEGRAM_BOT_USERNAME ??
    "kimkimuzbot";

  return <JoinEventPanel code={code} botUsername={botUsername} locale={locale} />;
}
