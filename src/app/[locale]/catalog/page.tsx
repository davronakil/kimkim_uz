import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { Link } from "@/i18n/navigation";
import { isStoredBusinessCategory, normalizeStoredCategory } from "@/lib/catalog/categories";
import { getCurrentUser } from "@/lib/auth/session";
import { listApprovedBusinessListings } from "@/lib/db/catalog-queries";
import { buildSitePageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { category: categoryParam } = await searchParams;
  const catalog = await getTranslations({ locale, namespace: "catalog" });
  const normalizedCategory = categoryParam ? normalizeStoredCategory(categoryParam) : null;
  const hasCategory = Boolean(categoryParam && isStoredBusinessCategory(categoryParam));

  if (hasCategory && normalizedCategory) {
    const categoryLabel = catalog(`categories.${normalizedCategory}`);
    const pagePath = `/${locale}/catalog?category=${normalizedCategory}`;

    return buildSitePageMetadata({
      locale,
      pagePath,
      title: `${categoryLabel} — ${catalog("title")}`,
      description: catalog("categoryMetaDescription", { category: categoryLabel }),
      ogTitle: `${categoryLabel} — ${catalog("title")}`,
    });
  }

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/catalog`,
    title: catalog("title"),
    description: catalog("metaDescription"),
    ogTitle: catalog("title"),
  });
}

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("catalog");
  const user = await getCurrentUser();
  const listings = await listApprovedBusinessListings();

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="kk-page-title">{t("title")}</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">{t("subtitle")}</p>
        </div>
        {user ? (
          <Link href="/catalog/manage" className="kk-btn-primary w-full sm:w-auto">
            {t("manageListings")}
          </Link>
        ) : (
          <Link href="/login" className="kk-btn-primary w-full sm:w-auto">
            {t("signInToSubmit")}
          </Link>
        )}
      </div>

      <Suspense fallback={<div className="min-h-[320px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />}>
        <CatalogBrowser listings={listings} />
      </Suspense>
    </div>
  );
}
