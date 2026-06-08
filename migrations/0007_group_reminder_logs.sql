-- Dedupe Telegram group reminders per event

CREATE TABLE IF NOT EXISTS event_group_reminder_logs (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, reminder_type)
);
