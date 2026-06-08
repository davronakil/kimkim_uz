-- Telegram notification support

ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;

CREATE TABLE IF NOT EXISTS event_reminder_logs (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_chat ON users(telegram_chat_id);
