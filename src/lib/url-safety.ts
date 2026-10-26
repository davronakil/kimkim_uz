/** Allow only http(s) (and optionally mailto) hrefs for user-supplied links. */
export function safeHttpUrl(
  rawHref: string | null | undefined,
  options?: { allowMailto?: boolean },
): string | null {
  if (!rawHref?.trim()) return null;
  const trimmed = rawHref.trim();
  const normalizedHref = trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed;

  try {
    const parsed = new URL(normalizedHref);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return normalizedHref;
    }
    if (options?.allowMailto && parsed.protocol === "mailto:") {
      return normalizedHref;
    }
  } catch {
    return null;
  }

  return null;
}
