import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSettlementsFromExpenses,
  canUndoSettlementPayment,
} from "../src/lib/expense/settlement.ts";
import { settleUpNotifyRecipientIds } from "../src/lib/expense/settle-recipients.ts";
import {
  markPaidCallbackData,
  parseMarkPaidCallbackData,
  parseUndoPaymentCallbackData,
  undoPaymentCallbackData,
} from "../src/lib/telegram/settle-callback-data.ts";

const dinner = (amount, splits, currency = "USD") => ({
  payer_id: "host",
  amount_cents: amount,
  currency,
  splits: Object.entries(splits).map(([user_id, amount_cents]) => ({ user_id, amount_cents })),
});

const paid = (from, to, amount, currency = "USD") => ({
  from_user_id: from,
  to_user_id: to,
  amount_cents: amount,
  currency,
});

test("a recorded payment clears that line and leaves the rest", () => {
  const expenses = [dinner(9000, { host: 3000, aziz: 3000, rustam: 3000 })];
  assert.equal(calculateSettlementsFromExpenses(expenses).length, 2);

  const after = calculateSettlementsFromExpenses(expenses, [paid("aziz", "host", 3000)]);
  assert.deepEqual(after, [
    { from_user_id: "rustam", to_user_id: "host", amount_cents: 3000, currency: "USD" },
  ]);
});

test("settling every line leaves nothing owed", () => {
  const expenses = [dinner(9000, { host: 3000, aziz: 3000, rustam: 3000 })];
  const payments = calculateSettlementsFromExpenses(expenses);
  assert.deepEqual(calculateSettlementsFromExpenses(expenses, payments), []);
});

test("an expense added after paying only shows the new remainder", () => {
  const first = dinner(6000, { host: 3000, aziz: 3000 });
  const payments = [paid("aziz", "host", 3000)];
  const later = dinner(2000, { host: 1000, aziz: 1000 });
  assert.deepEqual(calculateSettlementsFromExpenses([first, later], payments), [
    { from_user_id: "aziz", to_user_id: "host", amount_cents: 1000, currency: "USD" },
  ]);
});

test("a guest-count edit that shrinks a share turns the overpayment into a refund line", () => {
  const edited = dinner(6000, { host: 4000, aziz: 2000 });
  assert.deepEqual(calculateSettlementsFromExpenses([edited], [paid("aziz", "host", 3000)]), [
    { from_user_id: "host", to_user_id: "aziz", amount_cents: 1000, currency: "USD" },
  ]);
});

test("payments only offset balances in their own currency", () => {
  const expenses = [
    dinner(6000, { host: 3000, aziz: 3000 }, "USD"),
    dinner(200_000_00, { host: 100_000_00, aziz: 100_000_00 }, "UZS"),
  ];
  const after = calculateSettlementsFromExpenses(expenses, [paid("aziz", "host", 100_000_00, "UZS")]);
  assert.deepEqual(after, [
    { from_user_id: "aziz", to_user_id: "host", amount_cents: 3000, currency: "USD" },
  ]);
});

test("undo: either party, or the owner for settle-up rows only", () => {
  const single = { from_user_id: "aziz", to_user_id: "host", settle_up_id: null };
  assert.equal(canUndoSettlementPayment(single, "aziz", false), true);
  assert.equal(canUndoSettlementPayment(single, "host", false), true);
  assert.equal(canUndoSettlementPayment(single, "owner", true), false);
  const bulk = { ...single, settle_up_id: "su1" };
  assert.equal(canUndoSettlementPayment(bulk, "owner", true), true);
  assert.equal(canUndoSettlementPayment(bulk, "stranger", false), false);
});

test("bot callback data round-trips and fits Telegram's 64-byte limit", () => {
  const id = "a".repeat(21);
  const mark = markPaidCallbackData(id, "b".repeat(21), "UZS");
  assert.ok(Buffer.byteLength(mark) <= 64);
  assert.deepEqual(parseMarkPaidCallbackData(mark), {
    eventId: id,
    counterpartId: "b".repeat(21),
    currency: "UZS",
  });
  const undo = undoPaymentCallbackData(id, "c".repeat(21));
  assert.ok(Buffer.byteLength(undo) <= 64);
  assert.deepEqual(parseUndoPaymentCallbackData(undo), { eventId: id, paymentId: "c".repeat(21) });
  assert.equal(parseMarkPaidCallbackData("rsvp:y:abc"), null);
});

test("settle-up DMs go once per affected person, not the owner", () => {
  assert.deepEqual(
    settleUpNotifyRecipientIds(
      [
        { from_user_id: "aziz", to_user_id: "host" },
        { from_user_id: "lola", to_user_id: "host" },
        { from_user_id: "aziz", to_user_id: "lola" },
      ],
      "host",
    ).sort(),
    ["aziz", "lola"],
  );
  assert.deepEqual(
    settleUpNotifyRecipientIds([{ from_user_id: "host", to_user_id: "aziz" }], "host"),
    ["aziz"],
  );
});
