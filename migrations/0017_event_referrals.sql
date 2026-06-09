CREATE TABLE IF NOT EXISTS event_referrals (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  referred_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('web', 'telegram', 'stripe')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_referrals_referrer
  ON event_referrals(referrer_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_event_referrals_event
  ON event_referrals(event_id, created_at);
