/** Bound network waits, including reading the body, on older mobile WebViews. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: Omit<RequestInit, "signal"> = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    // Consume the small API response while the timeout still applies.
    const body = await response.arrayBuffer();
    return new Response(body.byteLength ? body : null, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } finally {
    clearTimeout(timer);
  }
}
