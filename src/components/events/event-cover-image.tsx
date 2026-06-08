import { EventCoverPlaceholder } from "@/components/events/event-cover-placeholder";
import type { Event } from "@/types";

type EventCoverFields = Pick<Event, "cover_image_key" | "title" | "id" | "starts_at">;

export function EventCoverImage({
  event,
  locale,
  variant = "hero",
  className = "",
  alt,
}: {
  event: EventCoverFields;
  locale?: string;
  variant?: "card" | "hero";
  className?: string;
  alt?: string;
}) {
  if (event.cover_image_key) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/media/${event.cover_image_key}`}
        alt={alt ?? event.title}
        className={className}
      />
    );
  }

  return (
    <EventCoverPlaceholder
      title={event.title}
      eventId={event.id}
      startsAt={event.starts_at}
      locale={locale}
      variant={variant}
      className={className}
    />
  );
}
