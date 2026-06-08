"use client";

import { useTranslations } from "next-intl";
import type { BusinessCategory } from "@/lib/catalog/categories";

type CategoryBadgeProps = {
  category: string;
  locale: string;
  size?: "sm" | "md";
};

export function CategoryBadge({ category, size = "md" }: CategoryBadgeProps) {
  const t = useTranslations("catalog.categories");

  let label = category;
  try {
    label = t(category as BusinessCategory);
  } catch {
    // keep raw category
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-emerald-50 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
    >
      {label}
    </span>
  );
}
