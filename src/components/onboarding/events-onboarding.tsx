"use client";

import { Bot, Link2, PartyPopper, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

const storageKey = "kimkim:onboarding-dismissed";

export function EventsOnboarding({
  botUsername,
  eventCount,
}: {
  botUsername: string;
  eventCount: number;
}) {
  const t = useTranslations("onboarding");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(storageKey) === "1") return;
    setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const steps = [
    {
      icon: PartyPopper,
      title: t("step1Title"),
      body: t("step1Body"),
      done: eventCount > 0,
      href: "/events/new",
      action: t("step1Action"),
    },
    {
      icon: Link2,
      title: t("step2Title"),
      body: t("step2Body"),
      done: false,
    },
    {
      icon: Bot,
      title: t("step3Title"),
      body: t("step3Body"),
      done: false,
      href: `https://t.me/${botUsername}`,
      action: t("step3Action"),
      external: true,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/60 dark:via-zinc-900 dark:to-teal-950/40 sm:p-6">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="absolute right-3 top-3 rounded-full p-2 text-zinc-500 transition hover:bg-white/80 hover:text-zinc-700 dark:hover:bg-zinc-800"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="space-y-4 pr-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {t("eyebrow")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{t("title")}</h2>
          <p className="mt-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-300">{t("subtitle")}</p>
        </div>

        <ol className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className={`flex gap-3 rounded-2xl border p-4 ${
                  step.done
                    ? "border-emerald-200/80 bg-white/80 dark:border-emerald-900 dark:bg-zinc-950/50"
                    : "border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="inline-flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                    <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {step.title}
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{step.body}</p>
                  {step.href && !step.done ? (
                    step.external ? (
                      <a
                        href={step.href}
                        target="_blank"
                        rel="noreferrer"
                        className="kk-btn-secondary inline-flex min-h-10 text-sm"
                      >
                        {step.action}
                      </a>
                    ) : (
                      <Link href={step.href} className="kk-btn-secondary inline-flex min-h-10 text-sm">
                        {step.action}
                      </Link>
                    )
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
