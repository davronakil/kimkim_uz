CREATE TABLE IF NOT EXISTS login_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  redirect_to TEXT NOT NULL DEFAULT '/events',
  locale TEXT NOT NULL DEFAULT 'uz',
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_challenges_expires_at
  ON login_challenges(expires_at);
