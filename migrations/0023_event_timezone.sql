-- Event times are now stored as canonical UTC (YYYY-MM-DDTHH:MM:SSZ) and rendered
-- through the zone they were entered in.
ALTER TABLE events ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent';
ALTER TABLE users ADD COLUMN timezone TEXT;

-- Rows written by the web form held a bare wall-clock reading from the browser's
-- <input type="datetime-local">. The whole app previously rendered those through
-- Asia/Tashkent, so that is the only interpretation that keeps existing events
-- showing the time organizers have been seeing. Rows written by the bot already
-- carried a UTC instant; they only need the canonical format.
UPDATE events
SET starts_at = CASE
      WHEN starts_at LIKE '%Z' OR starts_at LIKE '%+__:__' OR starts_at LIKE '%-__:__'
        THEN strftime('%Y-%m-%dT%H:%M:%SZ', datetime(starts_at))
      ELSE strftime('%Y-%m-%dT%H:%M:%SZ', datetime(starts_at, '-5 hours'))
    END,
    ends_at = CASE
      WHEN ends_at IS NULL THEN NULL
      WHEN ends_at LIKE '%Z' OR ends_at LIKE '%+__:__' OR ends_at LIKE '%-__:__'
        THEN strftime('%Y-%m-%dT%H:%M:%SZ', datetime(ends_at))
      ELSE strftime('%Y-%m-%dT%H:%M:%SZ', datetime(ends_at, '-5 hours'))
    END
WHERE datetime(starts_at) IS NOT NULL;
