import { CoverSubmitterBadge } from "@/components/ui/cover-submitter-badge";
import { toDatetimeLocalValue } from "@/lib/events/timezone";
import { resolveEventOgAccent } from "@/lib/og/event-theme";
import { personInitial } from "@/lib/utils";

const COVER_MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  uz: ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"],
  ru: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
};

const COVER_WEEKDAYS: Record<string, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  uz: ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"],
  ru: ["вс", "пн", "вт", "ср", "чт", "пт", "сб"],
};

/** Calendar badge labels that stay the same in Node and the browser. */
function coverDateBadge(startsAt: string, locale: string, timeZone: string) {
  const wall = toDatetimeLocalValue(startsAt, timeZone);
  const match = wall.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return { month: "", day: "", weekday: "" };

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const weekdayIndex = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  const lang = locale === "uz" || locale === "ru" ? locale : "en";

  return {
    month: COVER_MONTHS[lang][monthIndex] ?? "",
    day: String(day),
    weekday: COVER_WEEKDAYS[lang][weekdayIndex] ?? "",
  };
}

function hashUnit(eventId: string, salt: number) {
  let hash = salt;
  for (let i = 0; i < eventId.length; i += 1) {
    hash = (hash * 31 + eventId.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

type EventCoverPlaceholderProps = {
  title: string;
  eventId: string;
  startsAt: string;
  timeZone: string;
  locale?: string;
  creatorName?: string | null;
  description?: string | null;
  locationName?: string | null;
  variant?: "card" | "hero";
  className?: string;
};

export function EventCoverPlaceholder({
  title,
  eventId,
  startsAt,
  timeZone,
  locale = "en",
  creatorName,
  description,
  locationName,
  variant = "hero",
  className = "",
}: EventCoverPlaceholderProps) {
  const accent = resolveEventOgAccent(title, eventId, { description, locationName });
  const { month, day, weekday } = coverDateBadge(startsAt, locale, timeZone);
  const initial = personInitial(title);

  const blobA = {
    left: `${12 + hashUnit(eventId, 3) * 28}%`,
    top: `${8 + hashUnit(eventId, 7) * 24}%`,
    size: 120 + hashUnit(eventId, 11) * 80,
  };
  const blobB = {
    right: `${6 + hashUnit(eventId, 13) * 22}%`,
    bottom: `${10 + hashUnit(eventId, 17) * 20}%`,
    size: 140 + hashUnit(eventId, 19) * 100,
  };

  const isCard = variant === "card";

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${accent.gradientFrom} 0%, ${accent.gradientTo} 55%, ${accent.gradientFrom} 100%)`,
      }}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
          backgroundSize: isCard ? "18px 18px" : "24px 24px",
        }}
      />

      <div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          left: blobA.left,
          top: blobA.top,
          width: blobA.size,
          height: blobA.size,
          backgroundColor: accent.glow,
          opacity: 0.35,
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          right: blobB.right,
          bottom: blobB.bottom,
          width: blobB.size,
          height: blobB.size,
          backgroundColor: "#ffffff",
          opacity: 0.12,
        }}
      />

      <span
        className={`pointer-events-none absolute select-none font-bold leading-none text-white/10 ${
          isCard ? "bottom-2 left-3 text-7xl" : "bottom-4 left-5 text-[9rem] sm:text-[11rem]"
        }`}
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {initial}
      </span>

      <span
        className={`pointer-events-none absolute select-none drop-shadow-sm ${
          isCard ? "right-3 top-3 text-4xl" : "right-5 top-5 text-6xl sm:text-7xl"
        }`}
        role="img"
        aria-label=""
      >
        {accent.emoji}
      </span>

      <div
        className={`pointer-events-none absolute rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-md ${
          isCard
            ? "bottom-3 left-3 px-2.5 py-2"
            : "right-5 top-24 px-4 py-3 sm:right-6 sm:top-28"
        }`}
      >
        <p
          className={`font-semibold uppercase tracking-[0.2em] text-white/75 ${
            isCard ? "text-[9px]" : "text-[10px] sm:text-xs"
          }`}
        >
          {month}
        </p>
        <p
          className={`font-bold leading-none text-white ${isCard ? "text-2xl" : "text-4xl sm:text-5xl"}`}
        >
          {day}
        </p>
        {!isCard ? (
          <p className="mt-1 text-sm font-medium text-white/80">{weekday}</p>
        ) : null}
      </div>

      {creatorName ? (
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 flex items-start ${
            isCard ? "p-3" : "p-5 sm:p-6"
          }`}
        >
          <CoverSubmitterBadge
            name={creatorName}
            accentColor={accent.gradientFrom}
            variant={variant}
          />
        </div>
      ) : null}
    </div>
  );
}
