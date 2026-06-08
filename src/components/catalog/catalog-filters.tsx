"use client";

import { businessCategories } from "@/lib/catalog/categories";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type CatalogFiltersProps = {
  activeCategory?: string;
};

export function CatalogFilters({ activeCategory }: CatalogFiltersProps) {
  const t = useTranslations("catalog");
  const router = useRouter();

  function selectCategory(category?: string) {
    const url = category ? `/catalog?category=${category}` : "/catalog";
    router.push(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => selectCategory()}
        className={`rounded-full px-3 py-1.5 text-sm transition ${
          !activeCategory
            ? "bg-emerald-500 text-white"
            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        }`}
      >
        {t("allCategories")}
      </button>
      {businessCategories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => selectCategory(category)}
          className={`rounded-full px-3 py-1.5 text-sm transition ${
            activeCategory === category
              ? "bg-emerald-500 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          {t(`categories.${category}`)}
        </button>
      ))}
    </div>
  );
}
