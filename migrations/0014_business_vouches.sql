-- Community vouches for approved business listings

CREATE TABLE IF NOT EXISTS business_listing_vouches (
  listing_id TEXT NOT NULL REFERENCES business_listings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_vouches_listing ON business_listing_vouches(listing_id);
