import { Link } from "@/i18n/navigation";
import { MapPin, Store, ThumbsUp } from "lucide-react";
import { CategoryBadge } from "@/components/catalog/category-badge";
import type { BusinessListingWithVouches } from "@/types";

type BusinessCardProps = {
  listing: BusinessListingWithVouches;
  locale: string;
};

export function BusinessCard({ listing, locale }: BusinessCardProps) {
  return (
    <Link
      href={`/catalog/${listing.id}`}
      className="group touch-manipulation overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:border-emerald-200 sm:hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:sm:hover:border-emerald-900"
    >
      <div className="aspect-[16/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {listing.cover_image_key ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${listing.cover_image_key}`}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">
            <Store className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold leading-snug group-hover:text-emerald-600 sm:text-xl">
            {listing.name}
          </h3>
          <CategoryBadge category={listing.category} locale={locale} size="sm" />
        </div>
        <p className="line-clamp-2 text-base text-zinc-600 sm:text-sm dark:text-zinc-300">
          {listing.description || "—"}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500">
          {listing.vouch_count > 0 ? (
            <span className="inline-flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              {listing.vouch_count}
            </span>
          ) : null}
          {listing.location_name ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {listing.location_name}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
