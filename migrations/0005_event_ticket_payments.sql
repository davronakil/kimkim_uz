-- Ticket price for paid events + Stripe checkout records

ALTER TABLE events ADD COLUMN ticket_price_cents INTEGER;
ALTER TABLE events ADD COLUMN ticket_currency TEXT NOT NULL DEFAULT 'UZS';

CREATE TABLE IF NOT EXISTS event_payments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_payments_event_user ON event_payments(event_id, user_id);
