-- Shared event photo album. Rows cascade with the event; object bytes live in R2.

CREATE TABLE IF NOT EXISTS event_album_photos (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  thumb_key TEXT,
  width INTEGER,
  height INTEGER,
  byte_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_album_photos_event ON event_album_photos(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_album_photos_user ON event_album_photos(event_id, user_id);
