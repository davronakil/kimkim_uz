# KimKim.uz roadmap

Living plan for what shipped, what's next, and what we're intentionally not building yet.

## Shipped (v1)

- Telegram auth (Login Widget + Mini App)
- Events: create, edit, delete, cover image, Google Maps location
- Invite links + join flow + bot deep links
- Invite link rotation (owner)
- Leave event (members)
- Remove member (owner)
- Nested comments
- Expenses: equal + custom splits, settlement, delete expense
- Telegram DM notifications (comments, expenses, joins, edits, 24h/1h reminders)
- PWA + offline event details
- Bilingual EN/UZ UI (casual Uzbek tone)

## Phase 2 — polish & trust

| Priority | Item | Notes |
|----------|------|-------|
| ~~P0~~ | ~~Expense edit~~ | Shipped |
| ~~P0~~ | ~~Transfer ownership~~ | Shipped |
| P1 | Comment delete | Own comments only |
| P1 | Onboarding | First visit: start bot + create event tips |
| P1 | Empty states | Events list, join page, post-login |
| P2 | Telegram group link | `events.telegram_chat_id` — group announcements |
| P2 | Export settlement | Share “who owes whom” as image/text |

## Phase 3 — growth

- Share event to Telegram group in one tap
- Recurring events / templates (“Friday dinner” preset)
- UZS + USD toggle per event
- Public event page (read-only, no login) for large gatherings
- Referral: invite friends → bot tracks source

## Housekeeping / ops

- [ ] Single clean git commit of all v1 work (large diff pending on `main`)
- [ ] CI: `npm run build` on PR
- [ ] Staging worker env (optional `env.staging` in wrangler)
- [ ] Error monitoring (Cloudflare Workers observability + alerts)
- [ ] Google Maps key rotation doc in README

## Not planned (for now)

- Payment processing (Payme/Click) — settlement is informational only
- Native iOS/Android apps — PWA + Telegram Mini App is enough
- Full Splitwise parity — keep it lightweight for friend groups

## Success metrics (informal)

- Events created per week
- % events with 2+ members (invite worked)
- % users with bot started (notifications on)
- Return visits within 7 days of an upcoming event

---

Update this file when scope changes. Last reviewed: 2026-06-07.
