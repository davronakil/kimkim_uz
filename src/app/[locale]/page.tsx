import { CalendarDays, MessageSquare, Receipt, Send } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { eventUseCaseKeys } from "@/lib/event-use-cases";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const common = await getTranslations("common");
  const user = await getCurrentUser();

  const features = [
    {
      icon: CalendarDays,
      title: t("features.eventsTitle"),
      body: t("features.eventsBody"),
    },
    {
      icon: MessageSquare,
      title: t("features.commentsTitle"),
      body: t("features.commentsBody"),
    },
    {
      icon: Receipt,
      title: t("features.expensesTitle"),
      body: t("features.expensesBody"),
    },
    {
      icon: Send,
      title: t("features.telegramTitle"),
      body: t("features.telegramBody"),
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-16">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white px-5 py-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-2xl space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
            {common("appName")}
          </p>
          <h1 className="whitespace-pre-line text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {user ? t("heroTitleSignedIn") : t("heroTitle")}
          </h1>
          <p className="text-base text-zinc-600 sm:text-lg dark:text-zinc-300">
            {user ? t("heroSubtitleSignedIn") : t("heroSubtitle")}
          </p>
          {!user ? (
            <div className="flex flex-wrap justify-center gap-2">
              {eventUseCaseKeys.map((key) => (
                <span
                  key={key}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                >
                  {t(`useCases.${key}`)}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex w-full flex-col justify-center gap-3 pt-2 sm:flex-row sm:flex-wrap">
            <Link
              href={user ? "/events" : "/login"}
              className="kk-btn-primary w-full sm:w-auto"
            >
              {user ? t("ctaSignedIn") : t("ctaSignedOut")}
            </Link>
            {user ? (
              <Link href="/events/new" className="kk-btn-secondary w-full sm:w-auto">
                {common("createEvent")}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="kk-card p-5 shadow-sm transition active:scale-[0.99] sm:p-6 sm:hover:-translate-y-0.5 sm:hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/50">
              <Icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
            <p className="mt-2 text-base leading-relaxed text-zinc-600 sm:text-sm dark:text-zinc-300">
              {body}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
