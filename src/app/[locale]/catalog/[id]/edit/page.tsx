import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BusinessListingForm } from "@/components/catalog/business-listing-form";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getBusinessListingById } from "@/lib/db/catalog-queries";
import { buildSitePageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const catalog = await getTranslations({ locale, namespace: "catalog" });

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/catalog/edit`,
    title: catalog("editTitle"),
    description: catalog("metaDescription"),
    robots: { index: false, follow: false },
  });
}

export default async function CatalogEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  const listing = await getBusinessListingById(id);
  if (!listing || listing.representative_user_id !== user.id) {
    notFound();
  }

  const t = await getTranslations("catalog");
  const common = await getTranslations("common");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/catalog/manage" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← {common("back")}
        </Link>
        <h1 className="kk-page-title mt-2">{t("editTitle")}</h1>
      </div>
      <BusinessListingForm mode="edit" listing={listing} defaultTelegramUsername={user.username} />
    </div>
  );
}
