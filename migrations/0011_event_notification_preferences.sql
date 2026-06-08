-- Per-event Telegram activity notification preferences

CREATE TABLE IF NOT EXISTS event_notification_preferences (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'instant' CHECK (mode IN ('instant', 'digest', 'muted')),
  last_digest_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_notification_preferences_digest
  ON event_notification_preferences(mode, last_digest_at);
