import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import test from "node:test";

function timingSafeEqualString(a, b) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function timingSafeEqualHex(a, b) {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length === 0 || left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function safeHttpUrl(rawHref, options = {}) {
  if (!rawHref?.trim()) return null;
  const trimmed = rawHref.trim();
  const normalizedHref = trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed;
  try {
    const parsed = new URL(normalizedHref);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return normalizedHref;
    if (options.allowMailto && parsed.protocol === "mailto:") return normalizedHref;
  } catch {
    return null;
  }
  return null;
}

function isAuthDateFresh(authDate, maxAgeSeconds, now = Math.floor(Date.now() / 1000)) {
  if (!authDate || Number.isNaN(authDate)) return false;
  if (authDate > now + 60) return false;
  if (now - authDate > maxAgeSeconds) return false;
  return true;
}

test("timingSafeEqualString matches equal secrets", () => {
  assert.equal(timingSafeEqualString("abc", "abc"), true);
  assert.equal(timingSafeEqualString("abc", "abd"), false);
  assert.equal(timingSafeEqualString("abc", "ab"), false);
});

test("timingSafeEqualHex matches equal digests", () => {
  const digest = createHmac("sha256", "k").update("m").digest("hex");
  assert.equal(timingSafeEqualHex(digest, digest), true);
  assert.equal(timingSafeEqualHex(digest, "00".repeat(32)), false);
  assert.equal(timingSafeEqualHex(digest, "zz"), false);
});

test("safeHttpUrl rejects javascript and data schemes", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,hi"), null);
  assert.equal(safeHttpUrl("https://example.com/a"), "https://example.com/a");
  assert.equal(safeHttpUrl("www.example.com"), "https://www.example.com");
  assert.equal(safeHttpUrl("mailto:a@b.c", { allowMailto: true }), "mailto:a@b.c");
});

test("auth_date rejects future and stale timestamps", () => {
  const now = 1_700_000_000;
  assert.equal(isAuthDateFresh(now, 600, now), true);
  assert.equal(isAuthDateFresh(now - 601, 600, now), false);
  assert.equal(isAuthDateFresh(now + 120, 600, now), false);
});
