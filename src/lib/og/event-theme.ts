export type EventOgAccent = {
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  glow: string;
};

const fallbackAccents: EventOgAccent[] = [
  { emoji: "🎉", gradientFrom: "#059669", gradientTo: "#0d9488", glow: "#34d399" },
  { emoji: "✨", gradientFrom: "#047857", gradientTo: "#0891b2", glow: "#2dd4bf" },
  { emoji: "🎊", gradientFrom: "#0f766e", gradientTo: "#10b981", glow: "#6ee7b7" },
  { emoji: "🎈", gradientFrom: "#065f46", gradientTo: "#14b8a6", glow: "#5eead4" },
];

type KeywordTheme = {
  keywords: string[];
  accent: EventOgAccent;
};

/**
 * First match wins. Tokens of 3 letters or fewer use whole-word matching
 * ("tea" does not match "team", "gap" does not match "agape"). Longer tokens
 * match at a word start so "futbol" also hits "futbolchi" / "футбольный".
 * Apostrophes are folded (to'y → toy) for Uzbek Latin.
 */
const keywordThemes: KeywordTheme[] = [
  {
    keywords: ["to'y", "toy", "nikoh", "wedding", "свадьб", "никах", "kelin", "kuyov"],
    accent: { emoji: "💍", gradientFrom: "#0f766e", gradientTo: "#059669", glow: "#6ee7b7" },
  },
  {
    keywords: ["birthday", "tug'ilgan", "tugilgan kun", "день рожд", "др", "happy birthday"],
    accent: { emoji: "🎂", gradientFrom: "#b45309", gradientTo: "#059669", glow: "#fbbf24" },
  },
  {
    keywords: ["sunnat", "суннат"],
    accent: { emoji: "🌙", gradientFrom: "#1e3a5f", gradientTo: "#0f766e", glow: "#67e8f9" },
  },
  {
    keywords: ["aqiqa", "ақиқа", "акика"],
    accent: { emoji: "🕊️", gradientFrom: "#134e4a", gradientTo: "#0d9488", glow: "#99f6e4" },
  },
  {
    keywords: ["hayit", "eid", "ramazon", "ramadan", "iftar", "рамазан", "хайит", "ифтар"],
    accent: { emoji: "🌙", gradientFrom: "#1e3a5f", gradientTo: "#0f766e", glow: "#67e8f9" },
  },
  {
    keywords: [
      "futbol",
      "футбол",
      "football",
      "soccer",
      "stadion",
      "стадион",
      "soccer match",
    ],
    accent: { emoji: "⚽", gradientFrom: "#166534", gradientTo: "#15803d", glow: "#4ade80" },
  },
  {
    keywords: ["basketbol", "баскетбол", "basketball"],
    accent: { emoji: "🏀", gradientFrom: "#c2410c", gradientTo: "#b45309", glow: "#fdba74" },
  },
  {
    keywords: ["voleybol", "волейбол", "volleyball"],
    accent: { emoji: "🏐", gradientFrom: "#0369a1", gradientTo: "#0f766e", glow: "#7dd3fc" },
  },
  {
    keywords: ["tennis", "теннис"],
    accent: { emoji: "🎾", gradientFrom: "#4d7c0f", gradientTo: "#a16207", glow: "#bef264" },
  },
  {
    keywords: ["shaxmat", "шахмат", "chess"],
    accent: { emoji: "♟️", gradientFrom: "#1e293b", gradientTo: "#334155", glow: "#94a3b8" },
  },
  {
    keywords: ["boks", "бокс", "boxing"],
    accent: { emoji: "🥊", gradientFrom: "#991b1b", gradientTo: "#9a3412", glow: "#fca5a5" },
  },
  {
    keywords: ["kurash", "кураш", "wrestling", "борьба"],
    accent: { emoji: "🤼", gradientFrom: "#9a3412", gradientTo: "#b45309", glow: "#fdba74" },
  },
  {
    keywords: ["suzish", "плаван", "swimming", "basseyn", "бассейн"],
    accent: { emoji: "🏊", gradientFrom: "#0369a1", gradientTo: "#0891b2", glow: "#67e8f9" },
  },
  {
    keywords: ["yugurish", "пробежк", "running", "marafon", "marathon", "jog"],
    accent: { emoji: "🏃", gradientFrom: "#b45309", gradientTo: "#c2410c", glow: "#fdba74" },
  },
  {
    keywords: ["velosiped", "велосипед", "cycling", "velo"],
    accent: { emoji: "🚴", gradientFrom: "#166534", gradientTo: "#0f766e", glow: "#86efac" },
  },
  {
    keywords: ["sportzal", "fitnes", "fitness", "gym", "workout", "тренажер", "yoga", "йога"],
    accent: { emoji: "💪", gradientFrom: "#b91c1c", gradientTo: "#ea580c", glow: "#fb923c" },
  },
  {
    keywords: ["hockey", "xokkey", "хоккей"],
    accent: { emoji: "🏒", gradientFrom: "#1e3a8a", gradientTo: "#0e7490", glow: "#93c5fd" },
  },
  {
    keywords: ["sport", "спорт"],
    accent: { emoji: "🏅", gradientFrom: "#166534", gradientTo: "#0f766e", glow: "#86efac" },
  },
  {
    keywords: ["choyxona", "чайхан"],
    accent: { emoji: "🍵", gradientFrom: "#14532d", gradientTo: "#0f766e", glow: "#4ade80" },
  },
  {
    keywords: ["plov", "palov", "osh", "плов", "ош"],
    accent: { emoji: "🍚", gradientFrom: "#b45309", gradientTo: "#92400e", glow: "#fcd34d" },
  },
  {
    keywords: ["shashlik", "shashlyk", "шашлык", "kebab", "mangal"],
    accent: { emoji: "🍢", gradientFrom: "#9a3412", gradientTo: "#b45309", glow: "#fdba74" },
  },
  {
    keywords: ["barbecue", "barbekyu", "барбекю", "grill"],
    accent: { emoji: "🍖", gradientFrom: "#9a3412", gradientTo: "#c2410c", glow: "#fb923c" },
  },
  {
    keywords: ["pizza", "пицца"],
    accent: { emoji: "🍕", gradientFrom: "#c2410c", gradientTo: "#b45309", glow: "#fdba74" },
  },
  {
    keywords: ["nonushta", "завтрак", "breakfast", "brunch"],
    accent: { emoji: "🥐", gradientFrom: "#a16207", gradientTo: "#ca8a04", glow: "#fde047" },
  },
  {
    keywords: ["kechki ovqat", "ужин", "dinner", "lunch", "tushlik", "ovqat"],
    accent: { emoji: "🍽️", gradientFrom: "#b45309", gradientTo: "#0f766e", glow: "#fb923c" },
  },
  {
    keywords: ["tea", "choy"],
    accent: { emoji: "🍵", gradientFrom: "#14532d", gradientTo: "#0f766e", glow: "#4ade80" },
  },
  {
    keywords: ["kofe", "кофе", "coffee", "cafe", "кафе"],
    accent: { emoji: "☕", gradientFrom: "#78350f", gradientTo: "#92400e", glow: "#d97706" },
  },
  {
    keywords: ["gap", "гяп", "gyap"],
    accent: { emoji: "🤝", gradientFrom: "#047857", gradientTo: "#0e7490", glow: "#5eead4" },
  },
  {
    keywords: ["piknik", "picnic", "пикник"],
    accent: { emoji: "🧺", gradientFrom: "#166534", gradientTo: "#4d7c0f", glow: "#86efac" },
  },
  {
    keywords: ["dacha", "дача"],
    accent: { emoji: "🏡", gradientFrom: "#15803d", gradientTo: "#0f766e", glow: "#86efac" },
  },
  {
    keywords: ["konsert", "concert", "концерт", "karaoke", "караоке"],
    accent: { emoji: "🎤", gradientFrom: "#6d28d9", gradientTo: "#be185d", glow: "#e879f9" },
  },
  {
    keywords: ["kino", "movie", "film", "cinema", "театр", "theatre", "theater"],
    accent: { emoji: "🎬", gradientFrom: "#312e81", gradientTo: "#6d28d9", glow: "#a78bfa" },
  },
  {
    keywords: ["party", "kecha", "вечеринк", "tusovka", "тусовк"],
    accent: { emoji: "🥳", gradientFrom: "#be185d", gradientTo: "#7c3aed", glow: "#f9a8d4" },
  },
  {
    keywords: ["uchrashuv", "встреча", "meetup", "meeting", "majlis", "собрание"],
    accent: { emoji: "📅", gradientFrom: "#1d4ed8", gradientTo: "#0f766e", glow: "#93c5fd" },
  },
  {
    keywords: ["sayohat", "поездк", "trip", "travel", "safari"],
    accent: { emoji: "✈️", gradientFrom: "#0284c7", gradientTo: "#0891b2", glow: "#7dd3fc" },
  },
  {
    keywords: ["bolalar", "kids", "children", "детск"],
    accent: { emoji: "🧸", gradientFrom: "#db2777", gradientTo: "#ea580c", glow: "#fda4af" },
  },
  {
    keywords: ["o'yin", "oyin", "game night", "board game", "настольн"],
    accent: { emoji: "🎲", gradientFrom: "#6d28d9", gradientTo: "#4338ca", glow: "#c4b5fd" },
  },
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFC")
    .replace(/[\u2018\u2019`'ʻʼʹ]/g, "")
    .replace(/ё/g, "е");
}

function hasKeyword(haystack: string, keyword: string) {
  const text = normalizeForMatch(haystack);
  const needle = normalizeForMatch(keyword);
  if (!needle) return false;
  if (needle.includes(" ")) {
    return text.includes(needle);
  }
  const escaped = escapeRegExp(needle);
  if (needle.length <= 3) {
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u").test(text);
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, "u").test(text);
}

export function eventAccentHaystack(
  title: string,
  extra?: { description?: string | null; locationName?: string | null },
) {
  return [title, extra?.description, extra?.locationName].filter(Boolean).join("\n");
}

export function resolveEventOgAccent(
  title: string,
  eventId: string,
  extra?: { description?: string | null; locationName?: string | null },
): EventOgAccent {
  const haystack = eventAccentHaystack(title, extra);
  for (const theme of keywordThemes) {
    if (theme.keywords.some((keyword) => hasKeyword(haystack, keyword))) {
      return theme.accent;
    }
  }
  return fallbackAccents[hashString(eventId) % fallbackAccents.length]!;
}

export function truncateText(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
