# Database (Cloudflare D1)

KimKim uses a single D1 database (`kimkim-db`) with SQLite migrations in `migrations/`.

## Apply migrations

```bash
npm run db:migrate:local    # local .wrangler state
npm run db:migrate:remote   # production
```

## Schema overview

### Core

| Table | Purpose |
|-------|---------|
| `users` | Telegram users; `language_code` is app locale (`en` / `uz` / `ru`) |
| `sessions` | JWT session records |
| `events` | Events with location, cover, payment mode, invite code, visibility, linked Telegram group |
| `event_members` | Membership; `owner` or `member` |
| `comments` | Threaded discussion (`parent_id`) |
| `expenses` | Who paid, amount in cents, currency |
| `expense_splits` | Per-user split amounts |

### Invites & payments

| Table | Migration | Purpose |
|-------|-----------|---------|
| `invite_code` on `events` | `0002` | Rotatable invite links |
| `payment_mode`, ticket fields | `0004` | Free / split / pay_yourself / paid |
| `event_payments` | `0005` | Stripe checkout records |

### Telegram

| Table | Migration | Purpose |
|-------|-----------|---------|
| `event_reminder_logs` | `0003` | Per-user reminder dedup (24h / 1h) |
| `telegram_chat_id` on `users` | `0003` | DM notification target |
| `bot_sessions` | `0006` | Multi-step bot flows |
| `event_group_reminder_logs` | `0007` | Group reminder dedup |
| `event_rsvps` | `0008` | RSVP status (`going` / `declined`) |
| `event_notification_preferences` | `0011` | Per-user Telegram notification mode |
| `visibility` on `events` | `0012` | `private` (default) or `public` for SEO |

### Business catalog

| Table | Migration | Purpose |
|-------|-----------|---------|
| `platform_admins` | `0013` | Platform admins (`admin` / `superadmin`) |
| `business_listing_entitlements` | `0013` | Free + paid listing slots per user |
| `business_listings` | `0013` | Business submissions (`pending` / `approved` / `rejected`) |
| `business_slot_payments` | `0013` | Stripe purchases for extra listing slots |
| `business_listing_vouches` | `0014` | One vouch per user per approved listing |

Data migration `0015` renames stored category `wedding_venue` → `event_venue` on existing listings.

Full catalog flow: [CATALOG.md](./CATALOG.md).

## Notable columns on `events`

- `telegram_chat_id` — linked Telegram group for announcements
- `payment_mode` — `free` | `split` | `pay_yourself` | `paid`
- `ticket_price_cents`, `ticket_currency` — for Stripe paid events
- `invite_code` — public join slug
- `visibility` — `private` (link-only, `noindex`) or `public` (sitemap + Google indexing on `/events/[id]`)

## Event visibility & SEO

| Visibility | Event page `/events/[id]` | Join link `/join/[code]` | Sitemap / Discover |
|------------|---------------------------|--------------------------|--------------------|
| `private` (default) | `noindex`, shareable by URL | always `noindex` | excluded |
| `public` | indexable, Event JSON-LD | always `noindex` | listed on `/discover` + sitemap |

Public events in the sitemap are limited to those starting within the last 90 days.

## Queries

- Events, members, expenses: `src/lib/db/queries.ts`
- Business catalog + vouches: `src/lib/db/catalog-queries.ts`

Do not run raw SQL from route handlers except migrations.
