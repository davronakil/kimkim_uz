import { Link } from "@/i18n/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import type { Event } from "@/types";

type EventCardProps = {
  event: Event;
  locale: string;
};

export function EventCard({ event, locale }: EventCardProps) {
  const startsAt = new Date(event.starts_at);

  return (
    <Link
      href={`/events/${event.id}`}
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="aspect-[16/9] bg-gradient-to-br from-emerald-100 to-teal-200 dark:from-emerald-950 dark:to-teal-950">
        {event.cover_image_key ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${event.cover_image_key}`}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-emerald-700/70 dark:text-emerald-200/70">
            <CalendarDays className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-lg font-semibold group-hover:text-emerald-600">{event.title}</h3>
        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
          {event.description || "—"}
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {startsAt.toLocaleString(locale === "uz" ? "uz-UZ" : "en-US", {
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
