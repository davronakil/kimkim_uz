import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!signatureHeader) return false;

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (Number.isNaN(age) || age > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
