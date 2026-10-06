import { NextResponse } from "next/server";
import { defaultLocale } from "@/i18n/config";
import { buildEventIcs, calendarFilename } from "@/lib/events/calendar";
import { getEventById } from "@/lib/db/queries";
import { absoluteUrl, appBaseUrl } from "@/lib/seo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ics = buildEventIcs({
    id: event.id,
    title: event.title,
    description: event.description,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    timezone: event.timezone,
    location_name: event.location_name,
    location_address: event.location_address,
    url: absoluteUrl(`/${defaultLocale}/events/${event.id}`, appBaseUrl()),
  });

  const filename = calendarFilename(event.title);
  const encoded = encodeURIComponent(filename);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      // octet-stream + .ics URL keeps Chrome from inventing a UUID filename.
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
