import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { EventWorkspace } from "@/components/events/event-workspace";
import { PublicEventOverview } from "@/components/events/public-event-overview";
import { getCurrentUser } from "@/lib/auth/session";
import { buildEventJsonLd } from "@/lib/event-json-ld";
import { buildEventDetailMetadata } from "@/lib/event-metadata";
import { isPublicEvent } from "@/lib/events/visibility";
import { JsonLd } from "@/lib/seo";
import { displayName } from "@/lib/utils";
import { goingHeadcount } from "@/lib/events/headcount";
import { loadEventWorkspaceData } from "@/lib/events/workspace-data";
import {
  getEventById,
  getEventMemberRole,
  isEventMember,
  isEventOwner,
  listEventMembers,
} from "@/lib/db/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const event = await getEventById(id);

  if (!event) {
    return { title: "Event not found" };
  }

  return buildEventDetailMetadata(event, locale, `/${locale}/events/${id}`);
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const event = await getEventById(id);
  if (!event) notFound();

  const user = await getCurrentUser();
  const member = user ? await isEventMember(id, user.id) : false;

  if (!user || !member) {
    const members = await listEventMembers(id);
    const owner = members.find((member) => member.role === "owner");
    const jsonLd = isPublicEvent(event.visibility)
      ? await buildEventJsonLd(event, locale)
      : null;

    return (
      <>
        {jsonLd ? <JsonLd data={jsonLd} /> : null}
        <PublicEventOverview
          event={event}
          locale={locale}
          memberCount={goingHeadcount(members)}
          loggedIn={Boolean(user)}
          creatorName={owner ? displayName(owner) : null}
        />
      </>
    );
  }

  const [initialData, canEdit, role, botUsername] = await Promise.all([
    loadEventWorkspaceData(event),
    isEventOwner(id, user.id),
    getEventMemberRole(id, user.id),
    Promise.resolve(
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
        process.env.TELEGRAM_BOT_USERNAME ??
        "kimkimuzbot",
    ),
  ]);

  const jsonLd = isPublicEvent(event.visibility) ? await buildEventJsonLd(event, locale) : null;

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <EventWorkspace
      eventId={id}
      locale={locale}
      botUsername={botUsername}
      canEdit={canEdit}
      canLeave={role === "member"}
      showNotifyBanner={!user.telegram_chat_id}
      currentUserId={user.id}
      initialData={initialData}
    />
    </>
  );
}
