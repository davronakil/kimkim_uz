import assert from "node:assert/strict";
import {
  appleCashMessageUrl,
  cashAppPayUrl,
  displayPaymentValue,
  isApplePlatform,
  normalizePaymentMethod,
  normalizePhone,
  paymentDeepLink,
  venmoPayUrl,
} from "./methods";

assert.equal(normalizePhone("(555) 123-4567"), "+15551234567");
assert.equal(normalizePhone("1 555 123 4567"), "+15551234567");
assert.equal(normalizePhone("+998 90 123 45 67"), "+998901234567");
assert.equal(normalizePhone("123"), null);
assert.equal(normalizePhone("555-CALL-NOW"), null);

assert.deepEqual(normalizePaymentMethod("venmo", "@Davron-Akil"), {
  ok: true,
  method: { kind: "venmo", value: "Davron-Akil", value_type: "handle" },
});
assert.deepEqual(normalizePaymentMethod("venmo", "@abc"), { ok: false, error: "invalid_venmo" });
assert.deepEqual(normalizePaymentMethod("cashapp", "$davron1"), {
  ok: true,
  method: { kind: "cashapp", value: "davron1", value_type: "handle" },
});
assert.deepEqual(normalizePaymentMethod("cashapp", "$12345"), {
  ok: false,
  error: "invalid_cashtag",
});
assert.deepEqual(normalizePaymentMethod("zelle", " Me@Example.COM "), {
  ok: true,
  method: { kind: "zelle", value: "me@example.com", value_type: "email" },
});
assert.deepEqual(normalizePaymentMethod("apple_cash", "555.123.4567"), {
  ok: true,
  method: { kind: "apple_cash", value: "+15551234567", value_type: "phone" },
});
assert.deepEqual(normalizePaymentMethod("zelle", "not an email@"), {
  ok: false,
  error: "invalid_contact",
});

assert.equal(
  displayPaymentValue({ kind: "apple_cash", value: "+15551234567", value_type: "phone" }),
  "+1 (555) 123-4567",
);
assert.equal(displayPaymentValue({ kind: "venmo", value: "davron", value_type: "handle" }), "@davron");
assert.equal(displayPaymentValue({ kind: "cashapp", value: "davron", value_type: "handle" }), "$davron");

assert.equal(
  venmoPayUrl("davron", 4250, "Plov night · KimKim"),
  "https://venmo.com/davron?txn=pay&amount=42.50&note=Plov%20night%20%C2%B7%20KimKim",
);
assert.equal(cashAppPayUrl("davron", 4250), "https://cash.app/$davron/42.50");
assert.equal(cashAppPayUrl("davron", null), "https://cash.app/$davron");
assert.equal(venmoPayUrl("davron", null, "Gala"), "https://venmo.com/davron?txn=pay&note=Gala");
assert.equal(appleCashMessageUrl("a@icloud.com", null, "Gala"), "sms:a@icloud.com&body=Gala");
assert.equal(
  appleCashMessageUrl("+15551234567", 4250, "Plov night"),
  "sms:+15551234567&body=%2442.50%20Plov%20night",
);
assert.equal(
  paymentDeepLink({ kind: "zelle", value: "a@b.co", value_type: "email" }, 100, "x"),
  null,
);

const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const android =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
const mac =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const windows =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

assert.equal(isApplePlatform({ userAgent: iphone, platform: "iPhone", maxTouchPoints: 5 }), true);
assert.equal(isApplePlatform({ userAgent: mac, platform: "MacIntel", maxTouchPoints: 0 }), true);
assert.equal(
  isApplePlatform({ userAgent: android, platform: "Linux armv8l", maxTouchPoints: 5 }),
  false,
);
assert.equal(isApplePlatform({ userAgent: windows, platform: "Win32", maxTouchPoints: 0 }), false);

console.log("payments/methods.test.ts: ok");
