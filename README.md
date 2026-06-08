# KimKim.uz

**[kimkim.uz](https://kimkim.uz)** — plan weddings, gap circles, sunnat to'y, aqiqa, challari, choyxona, and any gathering. Coordinate guests, discuss in threads, split expenses, and sign in with Telegram.

Built for **English**, **Oʻzbek**, and **Русский** speakers. Deployed on Cloudflare Workers.

---

## Features

- **Events** — to'y, gap, sunnat to'y, aqiqa, challari, choyxona, birthdays; date/time, location, cover image
- **Public discover** — `/discover` lists events hosts mark as public (indexable, sitemap)
- **Invites** — shareable links, locale-aware bot deep links, link rotation, RSVP landing page
- **Payment modes** — Free, Split the bill, Pay for yourself, Paid (Stripe Checkout)
- **Members** — join, leave, transfer ownership, remove member
- **Threaded comments** — nested discussion; delete own comments (no replies)
- **Expense splitting** — equal or custom splits, settlement copy/share, delete
- **Business catalog** — Yelp-style directory at `/catalog`; submit listings, admin approval, community vouches, paid extra slots (Stripe)
- **Telegram bot** — create events, log expenses, RSVP buttons, group linking, bilingual + Russian
- **Notifications** — DM + group announcements; 24h / 1h reminders
- **OG previews** — cover photo → map pin → auto-generated event card
- **PWA** — installable, offline cached event details
- **Trilingual UI** — `/en`, `/uz`, `/ru`

See [ROADMAP.md](./ROADMAP.md) for what's next.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| App | [Next.js 16](https://nextjs.org/) (App Router), React 19, Tailwind CSS 4 |
| i18n | [next-intl](https://next-intl.dev/) |
| Hosting | [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) |
| Media | [Cloudflare R2](https://developers.cloudflare.com/r2/) |
| Payments | [Stripe](https://stripe.com/) Checkout (paid events + extra catalog slots) |
| Auth | [Telegram Login](https://core.telegram.org/widgets/login) + Web App initData |

---

## Architecture

```
Browser / Telegram Mini App
        │
        ▼
Next.js on Cloudflare Workers (OpenNext)
        │
   ┌────┴────┬──────────┬─────────┐
   ▼         ▼          ▼         ▼
  D1        R2      Telegram   Stripe
(events,   (covers)  (auth,    (paid
 comments,           bot)       tickets,
 expenses)                      catalog slots)
```

Hourly cron → event reminders (`worker-scheduled.mjs`).

Public surfaces: **`/discover`** (public events), **`/catalog`** (business directory).

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Cloudflare](https://dash.cloudflare.com/) account
- A [Telegram bot](https://t.me/BotFather) (for login + notifications)
- Google Maps API key with Places enabled (optional; manual location fallback without it)
- Stripe account (optional; only for paid events)

### 1. Clone and install

```bash
git clone https://github.com/davronakil/kimkim_uz.git
cd kimkim_uz
npm install
```

### 2. Configure secrets (local only)

This is a **public repository**. Never commit real credentials.

```bash
cp .dev.vars.example .dev.vars
```

See [.dev.vars.example](./.dev.vars.example) for all variables. Minimum for local dev:

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Long random string for session JWTs |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Bot username without `@` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps Places API key |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |
| `CRON_SECRET` | Random string for cron auth |

### 3. Database migrations (local)

```bash
npm run db:migrate:local
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000/en](http://localhost:3000/en), [/uz](http://localhost:3000/uz), or [/ru](http://localhost:3000/ru).

---

## Deploy to production

Full checklist: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

```bash
npm run db:migrate:remote
npm run deploy
```

Custom domains `kimkim.uz` and `www.kimkim.uz` are in `wrangler.jsonc`.

### Secrets (production)

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put CRON_SECRET
npx wrangler secret put STRIPE_SECRET_KEY        # paid events
npx wrangler secret put STRIPE_WEBHOOK_SECRET    # paid events
```

### Google Maps API key

The location picker needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as a **plain-text** Worker variable (browser-side). Also keep it in `.dev.vars` for local builds.

Enable **Maps JavaScript API** and **Places API** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Restrict by HTTP referrer:

- `https://kimkim.uz/*`
- `https://www.kimkim.uz/*`
- `http://localhost:*/*`

### Telegram bot

1. Create bot with [@BotFather](https://t.me/BotFather)
2. `/setdomain` → `kimkim.uz`
3. Set webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://kimkim.uz/api/telegram/webhook`
4. Users must **start the bot** (`/start`) to receive DM notifications

Bot reference: [docs/TELEGRAM.md](./docs/TELEGRAM.md).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (src only; `.open-next` ignored) |
| `npm run preview` | Build + preview in Workers runtime locally |
| `npm run deploy` | Build + deploy to Cloudflare Workers |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:remote` | Apply D1 migrations to production |
| `npm run bot:commands` | Register Telegram bot command menu |
| `npm run cf-typegen` | Regenerate Cloudflare binding types |

---

## Project structure

```
src/
├── app/[locale]/          # Pages (en, uz, ru)
├── app/api/               # REST routes (auth, events, stripe, telegram, og)
├── components/            # UI
├── i18n/                  # next-intl routing & config
├── lib/
│   ├── telegram/          # Bot handler, flows, notifications
│   ├── events/            # Create, payment mode, RSVP, visibility
│   ├── catalog/           # Business listing form + categories
│   ├── db/                  # queries.ts + catalog-queries.ts
│   ├── expense/           # Splits, settlement
│   ├── og/                # Dynamic social preview cards
│   └── stripe/            # Checkout + webhook (events + catalog slots)
docs/                      # TELEGRAM, DATABASE, CATALOG, DEPLOYMENT
messages/                  # en.json, uz.json, ru.json
migrations/                # D1 SQL migrations (0001–0014)
wrangler.jsonc             # Cloudflare Worker config
AGENTS.md                  # Notes for AI coding assistants
```

Database schema: [docs/DATABASE.md](./docs/DATABASE.md).

---

## Open Graph images

Share previews use this priority:

1. Event **cover photo** (R2)
2. **Map snapshot** (if lat/lng + Google Maps key)
3. **Generated card** — `/api/og/event/{id}/card?locale=ru`

Cards include title, date, location, payment mode, and themed styling. SVG output (1200×630), cached 24h.

## Event visibility

Hosts choose per event:

- **Private link** (default) — shareable at `/events/[id]`, but `noindex` and excluded from `sitemap.xml`
- **Public** — indexable event page with schema.org Event JSON-LD; listed in the sitemap with `/en`, `/uz`, `/ru` alternates

Invite links (`/join/[code]`) always stay `noindex` regardless of visibility.

See [docs/DATABASE.md](./docs/DATABASE.md#event-visibility--seo).

## Business catalog

A **Yelp-style directory** at `/catalog`:

- Logged-in users submit businesses (barbershops, salons, restaurants, dachas, agencies, etc.)
- Platform admins approve before publish
- Logged-in users **vouch** for places they trust (one per listing)
- One free listing slot per account; extra slots via Stripe

Homepage promotes the catalog to visitors; listings sort by vouch count.

See [docs/CATALOG.md](./docs/CATALOG.md).

---

## Security

- **Do not commit** `.dev.vars`, `.env*`, API tokens, or bot tokens
- `.dev.vars` and `.wrangler/` are gitignored
- Use Wrangler secrets and the Cloudflare dashboard for production credentials
- Restrict Google Maps API key to `kimkim.uz` and localhost

Report security issues privately, not in public GitHub issues.

---

## Documentation

| Doc | Contents |
|-----|----------|
| [ROADMAP.md](./ROADMAP.md) | Shipped features, Phase 3, ops backlog |
| [docs/CATALOG.md](./docs/CATALOG.md) | Business directory, vouches, admin, Stripe slots |
| [docs/TELEGRAM.md](./docs/TELEGRAM.md) | Bot commands, webhooks, notifications |
| [docs/DATABASE.md](./docs/DATABASE.md) | Tables, migrations |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Production checklist |
| [AGENTS.md](./AGENTS.md) | Quick reference for AI assistants |

---

## Roadmap

v1 and Phase 2 are complete. Growth items (templates, public pages, UZS/USD toggle) are in [ROADMAP.md](./ROADMAP.md).
