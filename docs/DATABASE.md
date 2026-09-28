# Database (Cloudflare D1)

KimKim uses a single D1 database (`kimkim-db`) with SQLite migrations in `migrations/`.

## Apply migrations

```bash
npm run db:migrate:local    # local .wrangler state
npm run db:migrate:remote   # production
```

Apply **remote** migrations before deploying a Worker that reads new columns.

## Schema overview

### Core

| Table | Purpose |
|-------|---------|
| `users` | Telegram users; `language_code` is app locale (`en` / `uz` / `ru`) |
| `sessions` | JWT session records |
| `events` | Events with location, cover, payment mode, invite code, visibility, linked Telegram group/topic |
| `event_members` | Membership; `owner` or `member` |
| `comments` | Threaded discussion (`parent_id`) |
| `expenses` | Who paid, amount in cents, currency |
| `expense_splits` | Per-user split amounts |

### Migrations

| Migration | What it adds |
|-----------|----------------|
| `0001` | Core tables (`users`, `sessions`, `events`, members, comments, expenses) |
| `0002` | `invite_code` on `events` |
| `0003` | `telegram_chat_id` on `users`; `event_reminder_logs` |
| `0004` | `payment_mode` + ticket fields on `events` |
| `0005` | `event_payments` (Stripe checkout) |
| `0006` | `bot_sessions` |
| `0007` | `event_group_reminder_logs` |
| `0008` | `event_rsvps` (`going` / `declined`) |
| `0009` | Host `payout_method` / `payout_details`; manual rows on `event_payments` |
| `0010` | RSVP `maybe` status |
| `0011` | `event_notification_preferences` (instant / digest / muted) |
| `0012` | `visibility` on `events` (`private` / `public`) |
| `0013` | Catalog: admins, listings, entitlements, slot payments |
| `0014` | `business_listing_vouches` |
| `0015` | Rename category `wedding_venue` → `event_venue` |
| `0016` | `expense_currency` on `events` |
| `0017` | `event_referrals` |
| `0018` | `additional_guest_count` on `event_rsvps` (0–20) |
| `0019` | `login_challenges` (web sign-in via `t.me/bot?start=login_…`) |
| `0020` | `telegram_message_thread_id` + `telegram_topic_name` on `events` |

Full catalog flow: [CATALOG.md](./CATALOG.md).

## Notable columns on `events`

- `telegram_chat_id` — linked Telegram group for announcements
- `telegram_message_thread_id` — forum topic thread when linked inside a topic (null = General / whole group)
- `telegram_topic_name` — topic title captured at link time, when Telegram includes it
- `payment_mode` — `free` | `split` | `pay_yourself` | `paid`
- `expense_currency` — `UZS` | `USD` for shared expense logging and settlements
- `ticket_price_cents`, `ticket_currency` — for Stripe paid events
- `invite_code` — public join slug
- `visibility` — `private` (link-only, `noindex`) or `public` (sitemap + Google indexing on `/events/[id]`)

## RSVP

`event_rsvps.status` is `going` | `maybe` | `declined`. `additional_guest_count` (0–20) is extra people on that RSVP, used for headcount and weighted equal expense splits.

## Auth challenges

`login_challenges` (migration `0019`) are one-time web sign-in records. A challenge is created from `/login`, completed when the user sends `/start login_<id>` to the bot, then claimed by the original tab or by tapping Continue on `/login?verify=`. Rows expire after 10 minutes.

## Referral tracking

Invite links include `?ref=<userId>` for the member sharing the link. Telegram bot deep links include the same referrer in the `/start` payload. When a user joins, `event_referrals` stores the first attribution for `(event_id, referred_user_id)` with source `web`, `telegram`, or `stripe`.

## Event visibility & SEO

| Visibility | Event page `/events/[id]` | Join link `/join/[code]` | Sitemap / Discover |
|------------|---------------------------|--------------------------|--------------------|
| `private` (default) | `noindex`, shareable by URL | always `noindex` | excluded |
| `public` | indexable, Event JSON-LD | always `noindex` | listed on `/discover` + sitemap |

Public events in the sitemap are limited to those starting within the last 90 days.

## Queries

- Events, members, expenses: `src/lib/db/queries.ts`
- Business catalog + vouches: `src/lib/db/catalog-queries.ts`

Prefer those helpers over ad-hoc SQL in route handlers.
