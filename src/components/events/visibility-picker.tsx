"use client";

import { Globe, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  defaultEventVisibility,
  eventVisibilityModes,
  type EventVisibility,
} from "@/lib/events/visibility";

const modeIcons: Record<EventVisibility, typeof Link2> = {
  private: Link2,
  public: Globe,
};

export function VisibilityPicker({
  defaultValue = defaultEventVisibility,
}: {
  defaultValue?: EventVisibility;
}) {
  const t = useTranslations("events.visibility");
  const [selected, setSelected] = useState<EventVisibility>(defaultValue);

  return (
    <div className="space-y-3">
      <input type="hidden" name="visibility" value={selected} />
      <div>
        <p className="kk-label">{t("fieldLabel")}</p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {t("subtitle")}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {eventVisibilityModes.map((mode) => {
          const Icon = modeIcons[mode];
          const active = selected === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setSelected(mode)}
              className={`flex min-h-28 touch-manipulation flex-col items-start gap-2 rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                active
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/25 dark:border-emerald-600 dark:bg-emerald-950/50"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}
              />
              <span className="text-sm font-semibold leading-tight">{t(`${mode}.title`)}</span>
              <span className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t(`${mode}.hint`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
