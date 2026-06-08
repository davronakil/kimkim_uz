-- Host payout preferences + manual paid-event tracking

ALTER TABLE users ADD COLUMN payout_method TEXT;
ALTER TABLE users ADD COLUMN payout_details TEXT;
ALTER TABLE users ADD COLUMN payout_updated_at TEXT;

CREATE TABLE event_payments_new (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  source TEXT NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'manual')),
  marked_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO event_payments_new (
  id, event_id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
  amount_cents, currency, status, source, created_at, updated_at
)
SELECT
  id, event_id, user_id, stripe_checkout_session_id, stripe_payment_intent_id,
  amount_cents, currency, status, 'stripe', created_at, updated_at
FROM event_payments;

DROP TABLE event_payments;
ALTER TABLE event_payments_new RENAME TO event_payments;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_payments_stripe_session
  ON event_payments(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_payments_manual_event_user
  ON event_payments(event_id, user_id)
  WHERE source = 'manual';

CREATE INDEX IF NOT EXISTS idx_event_payments_event_user ON event_payments(event_id, user_id);
