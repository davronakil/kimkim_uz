ALTER TABLE events ADD COLUMN invite_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_invite_code ON events(invite_code);

UPDATE events
SET invite_code = lower(hex(randomblob(6)))
WHERE invite_code IS NULL;
