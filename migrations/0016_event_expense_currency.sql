ALTER TABLE events ADD COLUMN expense_currency TEXT NOT NULL DEFAULT 'UZS'
  CHECK (expense_currency IN ('UZS', 'USD'));
