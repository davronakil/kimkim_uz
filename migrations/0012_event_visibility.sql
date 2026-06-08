-- Public vs private event discoverability (SEO / sitemap)

ALTER TABLE events ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'public'));

CREATE INDEX IF NOT EXISTS idx_events_public_starts_at
  ON events(starts_at)
  WHERE visibility = 'public';
