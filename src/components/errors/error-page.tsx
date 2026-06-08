import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ErrorPage({
  code,
  eyebrow,
  title,
  description,
  icon: Icon,
  suggestions,
  children,
}: {
  code?: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  suggestions?: Array<{ icon: LucideIcon; text: string }>;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white px-5 py-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />

        {code ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-2 top-4 select-none font-bold leading-none text-emerald-500/10 sm:right-4 sm:top-6 sm:text-[7rem]"
          >
            {code}
          </span>
        ) : null}

        <div className="relative space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600">{eyebrow}</p>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <Icon className="h-8 w-8" aria-hidden />
          </div>

          <div className="space-y-3">
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto max-w-lg text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-300">
              {description}
            </p>
          </div>

          <div className="flex w-full flex-col justify-center gap-3 pt-1 sm:flex-row sm:flex-wrap">
            {children}
          </div>
        </div>
      </section>

      {suggestions && suggestions.length > 0 ? (
        <section className="kk-card divide-y divide-zinc-200 dark:divide-zinc-800">
          {suggestions.map(({ icon: SuggestionIcon, text }) => (
            <div
              key={text}
              className="flex items-start gap-3 px-5 py-4 text-left sm:px-6"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <SuggestionIcon className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-base leading-relaxed text-zinc-600 sm:text-sm dark:text-zinc-300">
                {text}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
