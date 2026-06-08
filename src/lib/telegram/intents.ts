export type BotIntent =
  | { type: "command"; name: "start" | "help" | "create" | "events" | "expense" | "cancel" | "lang" }
  | { type: "natural"; name: "create" | "events" | "expense" | "help" }
  | { type: "text" };

const createPatterns = [
  /^\/create(?:@\w+)?$/i,
  /^\/new(?:@\w+)?$/i,
  /^\/yarat(?:@\w+)?$/i,
  /^(create event|new event|event yarat|yangi event)$/i,
];

const expensePatterns = [
  /^\/expense(?:@\w+)?$/i,
  /^\/xarajat(?:@\w+)?$/i,
  /^(log expense|expense log|xarajat qo'sh|xarajat qosh)$/i,
];

const eventsPatterns = [
  /^\/events(?:@\w+)?$/i,
  /^\/eventlar(?:@\w+)?$/i,
  /^(my events|eventlarim|eventlar)$/i,
];

const helpPatterns = [/^\/help(?:@\w+)?$/i, /^\/yordam(?:@\w+)?$/i, /^help$/i, /^yordam$/i];

const cancelPatterns = [/^\/cancel(?:@\w+)?$/i, /^\/bekor(?:@\w+)?$/i, /^cancel$/i, /^bekor$/i];

export function parseIntent(text: string): BotIntent {
  const trimmed = text.trim();

  if (/^\/start(?:@\w+)?(?:\s|$)/i.test(trimmed)) {
    return { type: "command", name: "start" };
  }
  if (/^\/lang(?:@\w+)?/i.test(trimmed)) {
    return { type: "command", name: "lang" };
  }
  if (cancelPatterns.some((pattern) => pattern.test(trimmed))) {
    return { type: "command", name: "cancel" };
  }
  if (helpPatterns.some((pattern) => pattern.test(trimmed))) {
    return { type: "command", name: "help" };
  }
  if (createPatterns.some((pattern) => pattern.test(trimmed))) {
    return { type: "command", name: "create" };
  }
  if (expensePatterns.some((pattern) => pattern.test(trimmed))) {
    return { type: "command", name: "expense" };
  }
  if (eventsPatterns.some((pattern) => pattern.test(trimmed))) {
    return { type: "command", name: "events" };
  }

  if (/^(create|new)\b/i.test(trimmed) && /event/i.test(trimmed)) {
    return { type: "natural", name: "create" };
  }
  if (/event.*(yarat|qil)/i.test(trimmed) || /yangi event/i.test(trimmed)) {
    return { type: "natural", name: "create" };
  }
  if (/^(my )?events$/i.test(trimmed) || /eventlar/i.test(trimmed)) {
    return { type: "natural", name: "events" };
  }
  if (/xarajat/i.test(trimmed) && /(qo'sh|qosh|log)/i.test(trimmed)) {
    return { type: "natural", name: "expense" };
  }

  return { type: "text" };
}
