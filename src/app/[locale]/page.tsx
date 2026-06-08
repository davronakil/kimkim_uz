import { CalendarDays, MessageSquare, Receipt, Send, Store } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeNames, locales, type Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { eventUseCaseKeys } from "@/lib/event-use-cases";
import {
  absoluteUrl,
  appBaseUrl,
  JsonLd,
  localeLanguageTag,
} from "@/lib/seo";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const common = await getTranslations("common");
  const catalog = await getTranslations("catalog");
  const meta = await getTranslations("meta");
  const user = await getCurrentUser();
  const baseUrl = appBaseUrl();
  const localeCode = locale as Locale;
  const siteUrl = absoluteUrl(`/${locale}`, baseUrl);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "KimKim",
      url: siteUrl,
      description: meta("description"),
      inLanguage: localeLanguageTag(localeCode),
      availableLanguage: locales.map((code) => ({
        "@type": "Language",
        name: localeNames[code],
        alternateName: code,
      })),
      potentialAction: {
        "@type": "RegisterAction",
        target: absoluteUrl(`/${locale}/login`, baseUrl),
        name: t("ctaSignedOut"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "KimKim",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web, Telegram",
      url: siteUrl,
      description: meta("description"),
      image: absoluteUrl(`/api/og/site?locale=${locale}`, baseUrl),
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ];

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
      <JsonLd data={jsonLd} />
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
            ) : (
              <Link href="/catalog" className="kk-btn-secondary w-full sm:w-auto">
                {t("catalogCta")}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white px-5 py-8 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-zinc-900 sm:px-10 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              {catalog("title")}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("catalogTitle")}
            </h2>
            <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
              {t("catalogBody")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/catalog" className="kk-btn-primary w-full sm:w-auto">
                {t("catalogBrowse")}
              </Link>
              {!user ? (
                <Link href="/login" className="kk-btn-secondary w-full sm:w-auto">
                  {t("catalogListBusiness")}
                </Link>
              ) : (
                <Link href="/catalog/manage" className="kk-btn-secondary w-full sm:w-auto">
                  {catalog("manageListings")}
                </Link>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {t.raw("catalogPoints").map((point: string, index: number) => (
              <div
                key={point}
                className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm text-zinc-700 dark:border-emerald-900/40 dark:bg-zinc-950/60 dark:text-zinc-200"
              >
                <span className="mr-2 font-semibold text-emerald-600 dark:text-emerald-400">
                  {index + 1}.
                </span>
                {point}
              </div>
            ))}
          </div>
        </div>
        <Store className="pointer-events-none absolute -bottom-6 -right-4 h-28 w-28 text-emerald-500/10 sm:h-36 sm:w-36" />
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
