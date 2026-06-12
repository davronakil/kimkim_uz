import { getTranslations } from "next-intl/server";
import { BusinessCard } from "@/components/catalog/business-card";
import { Link } from "@/i18n/navigation";
import { normalizeStoredCategory } from "@/lib/catalog/categories";
import { listRelatedBusinessListings } from "@/lib/db/catalog-queries";

type RelatedBusinessListingsProps = {
  listingId: string;
  category: string;
  locale: string;
};

export async function RelatedBusinessListings({
  listingId,
  category,
  locale,
}: RelatedBusinessListingsProps) {
  const t = await getTranslations("catalog");
  const tCategories = await getTranslations("catalog.categories");
  const normalizedCategory = normalizeStoredCategory(category);
  const related = await listRelatedBusinessListings(listingId, category, 3);

  if (related.length === 0) return null;

  const categoryLabel = tCategories(
    normalizedCategory as Parameters<typeof tCategories>[0],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {t("relatedTitle")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("relatedSubtitle", { category: categoryLabel })}
          </p>
        </div>
        <Link
          href={`/catalog?category=${normalizedCategory}`}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          {t("relatedViewCategory")} →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((listing) => (
          <BusinessCard
            key={listing.id}
            listing={listing}
            locale={locale}
            categoryLabel={tCategories(
              normalizeStoredCategory(listing.category) as Parameters<typeof tCategories>[0],
            )}
          />
        ))}
      </div>
    </section>
  );
}
