import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-5 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900 sm:px-8 sm:py-14">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-zinc-500">{description}</p>
      {children ? <div className="mt-6 flex flex-col items-center gap-3">{children}</div> : null}
    </div>
  );
}
