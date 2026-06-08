"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocationPicker, type LocationValue } from "@/components/events/location-picker";
import { businessCategories } from "@/lib/catalog/categories";
import type { BusinessListing } from "@/types";

type BusinessListingFormProps = {
  mode: "create" | "edit";
  listing?: BusinessListing;
  cancelHref?: string;
  defaultTelegramUsername?: string | null;
};

function listingToLocation(listing: BusinessListing): LocationValue | null {
  if (!listing.location_name) return null;
  return {
    name: listing.location_name,
    address: listing.location_address ?? "",
    lat: listing.location_lat ?? 0,
    lng: listing.location_lng ?? 0,
  };
}

export function BusinessListingForm({
  mode,
  listing,
  cancelHref = "/catalog/manage",
  defaultTelegramUsername,
}: BusinessListingFormProps) {
  const t = useTranslations("catalog.form");
  const tCategories = useTranslations("catalog.categories");
  const common = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [location, setLocation] = useState<LocationValue | null>(
    listing ? listingToLocation(listing) : null,
  );
  const [locationCleared, setLocationCleared] = useState(false);

  const initialLocation = listing ? listingToLocation(listing) : null;
  const hasCover = Boolean(listing?.cover_image_key) && !removeCover;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (location) {
      formData.set("location_name", location.name);
      formData.set("location_address", location.address);
      formData.set("location_lat", String(location.lat));
      formData.set("location_lng", String(location.lng));
    } else if (locationCleared) {
      formData.set("location_name", "");
      formData.set("location_address", "");
      formData.set("location_lat", "");
      formData.set("location_lng", "");
    }

    if (removeCover) {
      formData.set("remove_cover", "true");
    }

    const url = mode === "create" ? "/api/catalog" : `/api/catalog/${listing!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const response = await fetch(url, { method, body: formData, credentials: "include" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? t("submitError"));
        return;
      }

      router.push("/catalog/manage");
      router.refresh();
    } catch {
      setError(t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="kk-form space-y-6">
      <div>
        <label htmlFor="name" className="kk-label">
          {t("name")}
        </label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={listing?.name ?? ""}
          className="kk-input"
        />
      </div>

      <div>
        <label htmlFor="category" className="kk-label">
          {t("category")}
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={listing?.category ?? "other"}
          className="kk-input"
        >
          {businessCategories.map((category) => (
            <option key={category} value={category}>
              {tCategories(category)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="kk-label">
          {t("description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          defaultValue={listing?.description ?? ""}
          className="kk-input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="kk-label">
            {t("phone")}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={listing?.phone ?? ""}
            className="kk-input"
          />
        </div>
        <div>
          <label htmlFor="telegram_username" className="kk-label">
            {t("telegram")}
          </label>
          <input
            id="telegram_username"
            name="telegram_username"
            maxLength={64}
            placeholder="@username"
            defaultValue={listing?.telegram_username ?? defaultTelegramUsername ?? ""}
            className="kk-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="website_url" className="kk-label">
          {t("website")}
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          maxLength={500}
          placeholder="https://"
          defaultValue={listing?.website_url ?? ""}
          className="kk-input"
        />
      </div>

      <div>
        <p className="kk-label">{t("location")}</p>
        <LocationPicker
          initialValue={initialLocation}
          onSelect={(value) => {
            setLocation(value);
            setLocationCleared(false);
          }}
        />
        {initialLocation && !locationCleared ? (
          <button
            type="button"
            className="mt-2 text-sm text-zinc-500 underline"
            onClick={() => {
              setLocation(null);
              setLocationCleared(true);
            }}
          >
            {t("clearLocation")}
          </button>
        ) : null}
      </div>

      <div>
        <label htmlFor="cover_image" className="kk-label">
          {t("cover")}
        </label>
        {hasCover ? (
          <div className="mb-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/${listing!.cover_image_key}`}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setRemoveCover(true)}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              {t("removeCover")}
            </button>
          </div>
        ) : null}
        <input id="cover_image" name="cover_image" type="file" accept="image/*" className="kk-input" />
      </div>

      {mode === "edit" && listing?.status === "approved" ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {t("resubmitNotice")}
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={submitting} className="kk-btn-primary">
          {submitting ? common("loading") : mode === "create" ? t("submit") : common("save")}
        </button>
        <Link href={cancelHref} className="kk-btn-secondary text-center">
          {common("cancel")}
        </Link>
      </div>
    </form>
  );
}
