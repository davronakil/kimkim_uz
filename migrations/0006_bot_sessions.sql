-- Telegram bot conversation state (multi-step flows)

CREATE TABLE IF NOT EXISTS bot_sessions (
  chat_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flow TEXT,
  step TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  locale TEXT NOT NULL DEFAULT 'en',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_user ON bot_sessions(user_id);
