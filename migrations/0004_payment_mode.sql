-- Event payment / cost expectation label (Stripe "paid" mode later)

ALTER TABLE events ADD COLUMN payment_mode TEXT NOT NULL DEFAULT 'free'
  CHECK (payment_mode IN ('free', 'split', 'pay_yourself', 'paid'));
