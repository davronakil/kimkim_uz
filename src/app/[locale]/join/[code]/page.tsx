import type { Metadata } from "next";
import { Suspense } from "react";
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
  const t = await getTranslations("join");

  const botUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
    process.env.TELEGRAM_BOT_USERNAME ??
    "kimkimuzbot";

  return (
    <div className="relative -mx-4 min-h-[calc(100dvh-10rem)] px-4 py-6 sm:mx-0 sm:min-h-0 sm:px-0 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.14),transparent_60%)]" />
      <div className="relative">
        <Suspense
          fallback={
            <div className="mx-auto max-w-lg py-16 text-center text-zinc-500">{t("loading")}</div>
          }
        >
          <JoinEventPanel code={code} botUsername={botUsername} locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
