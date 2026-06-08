type StripeError = {
  error?: { message?: string };
};

export class StripeApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeApiError";
  }
}

function appendValue(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "object" && item !== null) {
        appendObject(params, `${key}[${index}]`, item as Record<string, unknown>);
      } else {
        params.append(`${key}[${index}]`, String(item));
      }
    });
    return;
  }

  if (typeof value === "object") {
    appendObject(params, key, value as Record<string, unknown>);
    return;
  }

  params.append(key, String(value));
}

function appendObject(params: URLSearchParams, prefix: string, object: Record<string, unknown>) {
  for (const [key, value] of Object.entries(object)) {
    appendValue(params, `${prefix}[${key}]`, value);
  }
}

export function buildStripeParams(data: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    appendValue(params, key, value);
  }
  return params;
}

export async function stripeRequest<T>(
  path: string,
  secretKey: string,
  data?: Record<string, unknown>,
  method: "GET" | "POST" = "POST",
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: method === "POST" && data ? buildStripeParams(data).toString() : undefined,
  });

  const payload = (await response.json()) as T & StripeError;
  if (!response.ok) {
    throw new StripeApiError(payload.error?.message ?? "Stripe request failed");
  }

  return payload;
}
