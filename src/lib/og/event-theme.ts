export type EventOgAccent = {
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  glow: string;
};

const accents: EventOgAccent[] = [
  { emoji: "🎉", gradientFrom: "#059669", gradientTo: "#0d9488", glow: "#34d399" },
  { emoji: "✨", gradientFrom: "#047857", gradientTo: "#0891b2", glow: "#2dd4bf" },
  { emoji: "🌿", gradientFrom: "#0f766e", gradientTo: "#10b981", glow: "#6ee7b7" },
  { emoji: "🎊", gradientFrom: "#065f46", gradientTo: "#14b8a6", glow: "#5eead4" },
];

const keywordAccents: Array<{ pattern: RegExp; accent: EventOgAccent }> = [
  {
    pattern: /to'y|toy|wedding|свадьб|никах|nikoh/i,
    accent: { emoji: "💍", gradientFrom: "#0f766e", gradientTo: "#059669", glow: "#6ee7b7" },
  },
  {
    pattern: /gap|гяп|gyap/i,
    accent: { emoji: "🤝", gradientFrom: "#047857", gradientTo: "#0e7490", glow: "#5eead4" },
  },
  {
    pattern: /choyxona|чайхан|tea/i,
    accent: { emoji: "🍵", gradientFrom: "#14532d", gradientTo: "#0f766e", glow: "#4ade80" },
  },
  {
    pattern: /birthday|tug'ilgan|день рожд/i,
    accent: { emoji: "🎂", gradientFrom: "#b45309", gradientTo: "#059669", glow: "#fbbf24" },
  },
  {
    pattern: /sunnat|суннат/i,
    accent: { emoji: "🌙", gradientFrom: "#1e3a5f", gradientTo: "#0f766e", glow: "#67e8f9" },
  },
  {
    pattern: /aqiqa|ақиқа|aqiqa/i,
    accent: { emoji: "🕊️", gradientFrom: "#134e4a", gradientTo: "#0d9488", glow: "#99f6e4" },
  },
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function resolveEventOgAccent(title: string, eventId: string): EventOgAccent {
  for (const entry of keywordAccents) {
    if (entry.pattern.test(title)) {
      return entry.accent;
    }
  }
  return accents[hashString(eventId) % accents.length]!;
}

export function truncateText(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
