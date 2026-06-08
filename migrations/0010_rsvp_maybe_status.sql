-- Allow maybe RSVP status

CREATE TABLE event_rsvps_new (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'declined')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (event_id, user_id)
);

INSERT INTO event_rsvps_new (event_id, user_id, status, updated_at)
SELECT event_id, user_id, status, updated_at
FROM event_rsvps;

DROP TABLE event_rsvps;
ALTER TABLE event_rsvps_new RENAME TO event_rsvps;
