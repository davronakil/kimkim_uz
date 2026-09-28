import { EventCoverPlaceholder } from "@/components/events/event-cover-placeholder";
import type { Event } from "@/types";

type EventCoverFields = Pick<Event, "cover_image_key" | "title" | "id" | "starts_at"> &
  Partial<Pick<Event, "description" | "location_name">>;

export function EventCoverImage({
  event,
  locale,
  creatorName,
  variant = "hero",
  className = "",
  alt,
}: {
  event: EventCoverFields;
  locale?: string;
  creatorName?: string | null;
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
      creatorName={creatorName}
      description={event.description}
      locationName={event.location_name}
      variant={variant}
      className={className}
    />
  );
}
