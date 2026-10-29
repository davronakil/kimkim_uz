-- Personal payment handles shown to people who owe the user in shared USD events

CREATE TABLE IF NOT EXISTS user_payment_methods (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('zelle', 'venmo', 'cashapp', 'apple_cash')),
  value TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('phone', 'email', 'handle')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, kind)
);
