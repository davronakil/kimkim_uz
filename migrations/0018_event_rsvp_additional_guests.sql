-- Track +1 / +X guests per RSVP for headcount and weighted equal splits.

ALTER TABLE event_rsvps
ADD COLUMN additional_guest_count INTEGER NOT NULL DEFAULT 0
CHECK (additional_guest_count >= 0 AND additional_guest_count <= 20);
