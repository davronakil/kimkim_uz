-- Business catalog: listings, platform admins, paid extra slots

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
  granted_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_listing_entitlements (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  included_slots INTEGER NOT NULL DEFAULT 1,
  paid_slots INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_listings (
  id TEXT PRIMARY KEY,
  representative_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  phone TEXT,
  telegram_username TEXT,
  website_url TEXT,
  location_name TEXT,
  location_address TEXT,
  location_lat REAL,
  location_lng REAL,
  cover_image_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_slot_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  slots_granted INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_business_listings_status ON business_listings(status);
CREATE INDEX IF NOT EXISTS idx_business_listings_category ON business_listings(category);
CREATE INDEX IF NOT EXISTS idx_business_listings_representative ON business_listings(representative_user_id);
CREATE INDEX IF NOT EXISTS idx_business_listings_published ON business_listings(published_at)
  WHERE status = 'approved';
