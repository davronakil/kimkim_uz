-- RSVP status from Telegram inline buttons (going / declined)

CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'declined')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);
