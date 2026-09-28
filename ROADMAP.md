# KimKim.uz roadmap

Living plan for what shipped, what's next, and what we're intentionally not building yet.

## Shipped

### Core product
- Telegram auth: **Continue in Telegram** (`t.me/bot?start=login_…` + `login_challenges`) and Mini App `initData`
- One-time return URLs (Stripe confirm, bot login `?verify=`) gated behind an extra Continue tap
- Events: create, edit, delete, cover image, Google Maps location
- Cover / OG emoji chosen from the event title and description (not a hash)
- Invite links + join flow + bot deep links (locale-aware: `en_join_`, `uz_join_`, `ru_join_`)
- Invite link rotation (owner)
- Leave event, remove member, transfer ownership
- Nested comments + delete own comments (blocked if has replies)
- Expenses: equal + custom splits, settlement copy/share, delete
- Payment modes: Free, Split, Pay yourself, Paid
- Stripe Checkout for paid events
- Beautiful invite landing for logged-out guests
- Onboarding banner + empty states
- PWA + offline event details
- Trilingual UI: EN / UZ / RU (default locale **uz**)

### Telegram
- Bot: `/create`, `/expense`, `/events`, `/help`, `/cancel`, `/lang`
- Create flow with location step (text, pin, skip)
- Quick expense logging (`/expense` then `150000 choyxona`)
- RSVP inline buttons (going / maybe / declined)
- Language picker + locale from invite links
- DM notifications (comments, expenses, joins, edits, reminders)
- Group link: `/link`, `/unlink`, `/event`, post invite to group
- Forum topics: `/link` inside a topic posts later announcements there instead of General
- Hourly cron reminders (24h / 1h) for DMs and linked groups / topics

### Social & ops
- Dynamic OG cards when no cover photo or map
- Map OG snapshot when location has coordinates
- Public read-only event pages for non-members and logged-out visitors
- **Public discover** page (`/discover`) for indexable events
- **Business catalog** (`/catalog`) — directory with admin approval, community vouches, map/list browse, and shareable category filters
- Event pages show **comments and expenses inline** (no tab switching)
- Default locale **Uzbek** with browser detection + persistent cookie
- Expanded **admin dashboard** (overview, catalog moderation, events, users, admins)
- Event creation templates (gap, choyxona, wedding, birthday, sunnat, paid)
- RSVP states: going / maybe / can't go, plus extra guests for headcount and expense splits
- Paid-event host payment summary + payout preference
- Per-event Telegram notification controls: instant / digest / muted
- PNG generated OG cards
- Referral tracking (web, Telegram bot, Stripe checkout)
- UZS + USD toggle per event for shared expenses
- CI: `npm run lint` + `npm run build` on push/PR

### Catalog & UX (since 2026-06)
- 30 refreshed business categories (migration `0015`: `wedding_venue` → `event_venue`)
- Homepage featured listings, top-vouched + recently-added rails on browse
- Listing share (copy link, Telegram, native share), related businesses, category SEO metadata
- Admin: unpublish / republish listings; catalog dynamic cover placeholders
- Mobile catalog overflow and card-width fixes

## Next

No product phase is locked. Ops leftovers:

- [ ] Staging worker env (optional `env.staging` in wrangler)
- [ ] Error monitoring alerts (beyond Workers observability)

## Not planned (for now)

- Local payment rails (Payme/Click) — Stripe for paid tickets; settlement stays informational
- Native iOS/Android apps — PWA + Telegram Mini App is enough
- Full Splitwise parity — keep it lightweight for friend groups

## Success metrics (informal)

- Events created per week
- % events with 2+ members (invite worked)
- % users with bot started (notifications on)
- Return visits within 7 days of an upcoming event

---

Update this file when scope changes. Last reviewed: 2026-09-28.
