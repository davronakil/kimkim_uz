"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocationPicker } from "@/components/events/location-picker";

export function CreateEventForm() {
  const t = useTranslations("events.form");
  const common = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (location) {
      formData.set("location_name", location.name);
      formData.set("location_address", location.address);
      formData.set("location_lat", String(location.lat));
      formData.set("location_lng", String(location.lng));
    }

    const response = await fetch("/api/events", {
      method: "POST",
      body: formData,
    });

    setSubmitting(false);

    if (response.ok) {
      const data = (await response.json()) as { id: string };
      router.push(`/events/${data.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          {t("title")}
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder={t("titlePlaceholder")}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          {t("description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder={t("descriptionPlaceholder")}
          className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="starts_at" className="text-sm font-medium">
            {t("startsAt")}
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="ends_at" className="text-sm font-medium">
            {t("endsAt")}
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("location")}</label>
        <LocationPicker onSelect={setLocation} />
      </div>

      <div className="space-y-2">
        <label htmlFor="cover_image" className="text-sm font-medium">
          {t("coverImage")}
        </label>
        <input
          id="cover_image"
          name="cover_image"
          type="file"
          accept="image/*"
          className="block w-full text-sm"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-emerald-500 px-5 py-2.5 font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {submitting ? common("loading") : t("submit")}
        </button>
      </div>
    </form>
  );
}
