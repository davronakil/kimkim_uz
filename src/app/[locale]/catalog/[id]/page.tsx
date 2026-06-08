import type { Metadata } from "next";
import { ExternalLink, MapPin, Phone, Store } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CategoryBadge } from "@/components/catalog/category-badge";
import { BusinessVouchButton } from "@/components/catalog/business-vouch-button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getBusinessListingVouchSummary,
  getBusinessListingWithRepresentative,
} from "@/lib/db/catalog-queries";
import { buildSitePageMetadata } from "@/lib/page-metadata";
import { displayName } from "@/lib/utils";
import { isPlatformAdmin } from "@/lib/platform/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const listing = await getBusinessListingWithRepresentative(id);

  if (!listing || listing.status !== "approved") {
    return buildSitePageMetadata({
      locale,
      pagePath: `/${locale}/catalog/${id}`,
      title: "Catalog",
      description: "",
      robots: { index: false, follow: false },
    });
  }

  return buildSitePageMetadata({
    locale,
    pagePath: `/${locale}/catalog/${id}`,
    title: listing.name,
    description: listing.description ?? listing.name,
    ogTitle: listing.name,
  });
}

export default async function CatalogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("catalog");
  const common = await getTranslations("common");
  const listing = await getBusinessListingWithRepresentative(id);

  if (!listing) notFound();

  const user = await getCurrentUser();
  const canView =
    listing.status === "approved" ||
    (user &&
      (listing.representative_user_id === user.id || (await isPlatformAdmin(user))));

  if (!canView) notFound();

  const isOwner = user?.id === listing.representative_user_id;
  const vouchSummary =
    listing.status === "approved"
      ? await getBusinessListingVouchSummary(id, user?.id)
      : { count: 0, vouchedByMe: false };
  const mapsUrl =
    listing.location_lat != null && listing.location_lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${listing.location_lat},${listing.location_lng}`
      : listing.location_address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.location_address)}`
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/catalog" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
          ← {t("backToCatalog")}
        </Link>
        {isOwner ? (
          <Link href={`/catalog/${id}/edit`} className="kk-btn-secondary ml-auto">
            {common("edit")}
          </Link>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="aspect-[21/9] bg-zinc-100 dark:bg-zinc-800">
          {listing.cover_image_key ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${listing.cover_image_key}`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-400">
              <Store className="h-16 w-16" />
            </div>
          )}
        </div>
        <div className="space-y-4 p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{listing.name}</h1>
            <CategoryBadge category={listing.category} locale={locale} />
            {listing.status !== "approved" ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                {listing.status === "pending" ? t("statusPending") : t("statusRejected")}
              </span>
            ) : null}
          </div>

          {listing.description ? (
            <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{listing.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-300">
            {listing.location_name ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {listing.location_name}
              </span>
            ) : null}
            {listing.phone ? (
              <a href={`tel:${listing.phone}`} className="inline-flex items-center gap-1.5 hover:text-emerald-600">
                <Phone className="h-4 w-4" />
                {listing.phone}
              </a>
            ) : null}
            {listing.telegram_username ? (
              <a
                href={`https://t.me/${listing.telegram_username.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-emerald-600"
              >
                @{listing.telegram_username.replace(/^@/, "")}
              </a>
            ) : null}
            {listing.website_url ? (
              <a
                href={listing.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-emerald-600"
              >
                <ExternalLink className="h-4 w-4" />
                {t("website")}
              </a>
            ) : null}
          </div>

          {mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="kk-btn-secondary inline-flex">
              <MapPin className="h-4 w-4" />
              {t("openInMaps")}
            </a>
          ) : null}

          {listing.status === "approved" ? (
            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <BusinessVouchButton
                listingId={listing.id}
                initialCount={vouchSummary.count}
                initialVouched={vouchSummary.vouchedByMe}
                loggedIn={Boolean(user)}
                isOwner={Boolean(isOwner)}
              />
            </div>
          ) : null}

          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">{t("representative")}</p>
            <p className="font-medium">{displayName(listing)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
