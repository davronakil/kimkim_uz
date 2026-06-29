ALTER TABLE events ADD COLUMN expenses_enabled INTEGER NOT NULL DEFAULT 0;

UPDATE events
SET expenses_enabled = 1
WHERE payment_mode = 'split'
   OR EXISTS (
    SELECT 1
    FROM expenses
    WHERE expenses.event_id = events.id
  );
