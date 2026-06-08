import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/lib/locale";
import type { Locale } from "@/i18n/config";
import { EventCoverImage } from "@/components/events/event-cover-image";
import { CalendarDays, MapPin } from "lucide-react";
import { PaymentModeBadge } from "@/components/events/payment-mode-badge";
import type { Event } from "@/types";

type EventCardProps = {
  event: Event;
  locale: string;
  past?: boolean;
};

export function EventCard({ event, locale, past = false }: EventCardProps) {
  const startsAt = new Date(event.starts_at);

  return (
    <Link
      href={`/events/${event.id}`}
      className={`group touch-manipulation overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:border-emerald-200 sm:hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:sm:hover:border-emerald-900 ${past ? "opacity-80" : ""}`}
    >
      <div className="aspect-[16/9] overflow-hidden">
        <EventCoverImage
          event={event}
          locale={locale}
          variant="card"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold leading-snug group-hover:text-emerald-600 sm:text-xl">
            {event.title}
          </h3>
          <PaymentModeBadge mode={event.payment_mode ?? "free"} size="sm" />
        </div>
        <p className="line-clamp-2 text-base text-zinc-600 sm:text-sm dark:text-zinc-300">
          {event.description || "—"}
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {startsAt.toLocaleString(intlLocale(locale as Locale), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          {event.location_name ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.location_name}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
