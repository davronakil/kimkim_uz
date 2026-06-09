import { BusinessCoverPlaceholder } from "@/components/catalog/business-cover-placeholder";
import type { BusinessListing } from "@/types";

type BusinessCoverFields = Pick<
  BusinessListing,
  "cover_image_key" | "name" | "id" | "category" | "location_name"
>;

export function BusinessCoverImage({
  listing,
  categoryLabel,
  submittedByName,
  variant = "hero",
  className = "",
  alt,
}: {
  listing: BusinessCoverFields;
  categoryLabel: string;
  submittedByName?: string | null;
  variant?: "card" | "hero";
  className?: string;
  alt?: string;
}) {
  if (listing.cover_image_key) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/media/${listing.cover_image_key}`}
        alt={alt ?? listing.name}
        className={className}
      />
    );
  }

  return (
    <BusinessCoverPlaceholder
      name={listing.name}
      listingId={listing.id}
      category={listing.category}
      categoryLabel={categoryLabel}
      locationName={listing.location_name}
      submittedByName={submittedByName}
      variant={variant}
      className={className}
    />
  );
}
