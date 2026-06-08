# KimKim.uz roadmap

Living plan for what shipped, what's next, and what we're intentionally not building yet.

## Shipped (v1 + Phase 2)

### Core product
- Telegram auth (Login Widget + Mini App)
- Events: create, edit, delete, cover image, Google Maps location
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
- Trilingual UI: EN / UZ / RU

### Telegram
- Bot: `/create`, `/expense`, `/events`, `/help`, `/cancel`, `/lang`
- Create flow with location step (text, pin, skip)
- Quick expense logging (`/expense 150000 choyxona`)
- RSVP inline buttons (going / declined)
- Language picker + locale from invite links
- DM notifications (comments, expenses, joins, edits, reminders)
- Group link: `/link`, `/unlink`, `/event`, post invite to group
- Hourly cron reminders (24h / 1h) for DMs and linked groups

### Social & ops
- Dynamic OG cards when no cover photo or map
- Map OG snapshot when location has coordinates
- Public read-only event pages for non-members and logged-out visitors
- **Public discover** page (`/discover`) for indexable events
- **Business catalog** (`/catalog`) — Yelp-style directory with admin approval and community vouches
- Event creation templates
- RSVP states: going / maybe / can't go
- Paid-event host payment summary
- Per-event Telegram notification controls: instant / digest / muted
- PNG generated OG cards
- CI: `npm run build` on push/PR

## Phase 3 — growth

| Priority | Item | Notes |
|----------|------|-------|
| P1 | Event templates | Shipped: gap, choyxona, wedding, birthday, sunnat, paid |
| P1 | UZS + USD toggle per event | Display + expense currency |
| P2 | Public read-only event page | Shipped for `/events/:id`; browse at `/discover` |
| P2 | Business catalog | Shipped: submit, admin review, vouches, Stripe extra slots |
| P2 | Referral tracking | Invite source via bot start param |
| P3 | PNG OG cards | Shipped for generated site/event cards |

## Housekeeping / ops

- [x] Git commit of v1 + Phase 2 work
- [x] CI: `npm run lint` + `npm run build` on PR
- [x] README + docs (TELEGRAM, DATABASE, DEPLOYMENT, AGENTS)
- [x] Google Maps key rotation documented in README
- [ ] Staging worker env (optional `env.staging` in wrangler)
- [ ] Error monitoring alerts (beyond Workers observability)
- [x] `npm run lint` clean locally and in CI

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

Update this file when scope changes. Last reviewed: 2026-06-08.
