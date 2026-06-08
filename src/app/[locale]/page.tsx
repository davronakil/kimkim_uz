import { CalendarDays, MessageSquare, Receipt, Send } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";

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
    <div className="space-y-16">
      <section className="mx-auto max-w-3xl space-y-6 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">
          {common("appName")}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t("heroTitle")}</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">{t("heroSubtitle")}</p>
        <div className="flex justify-center gap-3">
          <Link
            href={user ? "/events" : "/login"}
            className="rounded-full bg-emerald-500 px-6 py-3 font-medium text-white hover:bg-emerald-600"
          >
            {user ? t("ctaSignedIn") : t("ctaSignedOut")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {features.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Icon className="mb-4 h-8 w-8 text-emerald-500" />
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
