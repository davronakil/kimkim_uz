-- Map retired wedding_venue slug to event_venue

UPDATE business_listings
SET category = 'event_venue', updated_at = datetime('now')
WHERE category = 'wedding_venue';
