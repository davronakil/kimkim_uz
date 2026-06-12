import { getTranslations } from "next-intl/server";
import { BusinessCard } from "@/components/catalog/business-card";
import { Link } from "@/i18n/navigation";
import { listFeaturedBusinessListings } from "@/lib/db/catalog-queries";
import { normalizeStoredCategory } from "@/lib/catalog/categories";

type HomeFeaturedCatalogProps = {
  locale: string;
};

export async function HomeFeaturedCatalog({ locale }: HomeFeaturedCatalogProps) {
  const t = await getTranslations("home");
  const tCategories = await getTranslations("catalog.categories");
  const featured = await listFeaturedBusinessListings(3);

  if (featured.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-emerald-100 pt-6 dark:border-emerald-900/40">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {t("featuredTitle")}
          </h3>
          {t("featuredSubtitle") ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{t("featuredSubtitle")}</p>
          ) : null}
        </div>
        <Link href="/catalog" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          {t("featuredViewAll")} →
        </Link>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((listing) => (
          <div key={listing.id} className="min-w-0">
            <BusinessCard
              listing={listing}
              locale={locale}
              categoryLabel={tCategories(
                normalizeStoredCategory(listing.category) as Parameters<typeof tCategories>[0],
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
