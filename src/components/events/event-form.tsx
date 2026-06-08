"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocationPicker, type LocationValue } from "@/components/events/location-picker";
import { PaymentModePicker } from "@/components/events/payment-mode-picker";
import { toDatetimeLocalValue } from "@/lib/events/form";
import type { Event, EventPaymentMode } from "@/types";

type EventFormProps = {
  mode: "create" | "edit";
  event?: Event;
  cancelHref?: string;
};

function eventToLocation(event: Event): LocationValue | null {
  if (!event.location_name) return null;
  return {
    name: event.location_name,
    address: event.location_address ?? "",
    lat: event.location_lat ?? 0,
    lng: event.location_lng ?? 0,
  };
}

export function EventForm({ mode, event, cancelHref }: EventFormProps) {
  const t = useTranslations("events.form");
  const events = useTranslations("events");
  const common = useTranslations("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [paymentMode, setPaymentMode] = useState<EventPaymentMode>(
    event?.payment_mode ?? "free",
  );
  const [paymentPickerKey, setPaymentPickerKey] = useState(0);
  const [location, setLocation] = useState<LocationValue | null>(
    event ? eventToLocation(event) : null,
  );
  const [locationCleared, setLocationCleared] = useState(false);

  const initialLocation = event ? eventToLocation(event) : null;
  const templates: Array<{
    id: string;
    title: string;
    description: string;
    paymentMode: EventPaymentMode;
  }> = [
    {
      id: "gap",
      title: t("templates.gap.title"),
      description: t("templates.gap.description"),
      paymentMode: "split",
    },
    {
      id: "choyxona",
      title: t("templates.choyxona.title"),
      description: t("templates.choyxona.description"),
      paymentMode: "pay_yourself",
    },
    {
      id: "wedding",
      title: t("templates.wedding.title"),
      description: t("templates.wedding.description"),
      paymentMode: "free",
    },
    {
      id: "birthday",
      title: t("templates.birthday.title"),
      description: t("templates.birthday.description"),
      paymentMode: "split",
    },
    {
      id: "sunnat",
      title: t("templates.sunnat.title"),
      description: t("templates.sunnat.description"),
      paymentMode: "free",
    },
    {
      id: "paid",
      title: t("templates.paid.title"),
      description: t("templates.paid.description"),
      paymentMode: "paid",
    },
  ];

  function handleLocationSelect(value: LocationValue | null) {
    setLocation(value);
    setLocationCleared(value === null && Boolean(initialLocation));
  }

  function applyTemplate(template: (typeof templates)[number]) {
    setTitle(template.title);
    setDescription(template.description);
    setPaymentMode(template.paymentMode);
    setPaymentPickerKey((value) => value + 1);
  }

  async function onSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = formEvent.currentTarget;
    const formData = new FormData(form);

    if (location?.name) {
      formData.set("location_name", location.name);
      formData.set("location_address", location.address);
      if (location.lat) formData.set("location_lat", String(location.lat));
      if (location.lng) formData.set("location_lng", String(location.lng));
    }

    if (mode === "edit" && locationCleared) {
      formData.set("clear_location", "true");
    }

    if (mode === "edit" && removeCover) {
      formData.set("remove_cover", "true");
    }

    const url = mode === "create" ? "/api/events" : `/api/events/${event!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(url, { method, body: formData });
    setSubmitting(false);

    if (response.ok) {
      const data = (await response.json()) as { id?: string; event?: Event };
      const eventId = mode === "create" ? data.id! : event!.id;
      router.push(`/events/${eventId}`);
      router.refresh();
      return;
    }

    setError(t("saveError"));
  }

  async function onDelete() {
    if (!event) return;
    setDeleting(true);
    setError(null);

    const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    setDeleting(false);

    if (response.ok) {
      router.push("/events");
      router.refresh();
      return;
    }

    setError(t("deleteError"));
    setShowDeleteConfirm(false);
  }

  const hasCover = Boolean(event?.cover_image_key) && !removeCover;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
    >
      {mode === "create" ? (
        <section className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="space-y-1">
            <p className="kk-label">{t("templatesTitle")}</p>
            <p className="text-sm leading-relaxed text-emerald-950/75 dark:text-emerald-100/75">
              {t("templatesSubtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-950 transition hover:border-emerald-400 hover:bg-emerald-100 active:scale-[0.98] dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
              >
                {template.title}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="title" className="kk-label">
          {t("title")}
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(inputEvent) => setTitle(inputEvent.target.value)}
          placeholder={t("titlePlaceholder")}
          className="kk-input"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="kk-label">
          {t("description")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={description}
          onChange={(inputEvent) => setDescription(inputEvent.target.value)}
          placeholder={t("descriptionPlaceholder")}
          className="kk-textarea"
        />
      </div>

      <PaymentModePicker
        key={paymentPickerKey}
        defaultValue={paymentMode}
        defaultTicketPriceCents={event?.ticket_price_cents}
        defaultTicketCurrency={event?.ticket_currency ?? "UZS"}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="starts_at" className="kk-label">
            {t("startsAt")}
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocalValue(event?.starts_at)}
            className="kk-input"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="ends_at" className="kk-label">
            {t("endsAt")}
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(event?.ends_at)}
            className="kk-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="kk-label">{t("location")}</label>
        <LocationPicker initialValue={initialLocation} onSelect={handleLocationSelect} />
      </div>

      <div className="space-y-2">
        <label htmlFor="cover_image" className="kk-label">
          {t("coverImage")}
        </label>
        {hasCover ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${event!.cover_image_key}`}
                alt={event!.title}
                className="aspect-[21/9] w-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setRemoveCover(true)}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              {t("removeCover")}
            </button>
          </div>
        ) : null}
        <input
          id="cover_image"
          name="cover_image"
          type="file"
          accept="image/*"
          className="block w-full text-sm"
        />
        {mode === "edit" && hasCover ? (
          <p className="text-xs text-zinc-500">{t("coverReplaceHint")}</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="submit"
          disabled={submitting || deleting}
          className="kk-btn-primary w-full sm:w-auto"
        >
          {submitting
            ? common("loading")
            : mode === "create"
              ? t("submit")
              : t("saveChanges")}
        </button>
        {cancelHref ? (
          <button
            type="button"
            onClick={() => router.push(cancelHref)}
            className="kk-btn-secondary w-full sm:w-auto"
          >
            {common("cancel")}
          </button>
        ) : null}
      </div>

      {mode === "edit" ? (
        <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              {events("deleteEvent")}
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
              <p className="text-sm text-red-900 dark:text-red-100">{events("deleteConfirm")}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting}
                  className="kk-btn min-h-12 bg-red-600 text-white hover:bg-red-700"
                >
                  {deleting ? common("loading") : common("delete")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="kk-btn-secondary"
                >
                  {common("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}
