-- "Mark paid" / "Settle up": recorded transfers that offset expense balances

CREATE TABLE IF NOT EXISTS expense_settlement_payments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL,
  recorded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  settle_up_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expense_settlement_payments_event
  ON expense_settlement_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_expense_settlement_payments_settle_up
  ON expense_settlement_payments(settle_up_id)
  WHERE settle_up_id IS NOT NULL;
