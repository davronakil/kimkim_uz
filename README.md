# KimKim.uz

**[kimkim.uz](https://kimkim.uz)** — plan weddings, gap circles, sunnat to'y, aqiqa, challari, choyxona, and any gathering. Coordinate guests, discuss in threads, split expenses, and sign in with Telegram.

Built for **English** and **Oʻzbek** speakers, deployed on Cloudflare Workers.

---

## Features

- **Events** — to'y, gap, sunnat to'y, aqiqa, challari, choyxona, birthdays; date/time, location, cover image
- **Invites** — shareable links, bot deep links, link rotation
- **Members** — join, leave, organizer can remove members
- **Threaded comments** — nested discussion on each event
- **Expense splitting** — equal or custom splits, settlement, delete
- **Telegram** — Login Widget + Mini App, bot DMs for activity and reminders
- **PWA** — installable, offline cached event details
- **Bilingual UI** — English and Uzbek (`/en`, `/uz`)

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
| Auth | [Telegram Login](https://core.telegram.org/widgets/login) + Web App initData |

---

## Architecture

```
Browser / Telegram Mini App
        │
        ▼
Next.js on Cloudflare Workers (OpenNext)
        │
   ┌────┴────┬──────────┐
   ▼         ▼          ▼
  D1        R2      Telegram API
(events,   (covers)  (auth, share)
 comments,
 expenses)
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Cloudflare](https://dash.cloudflare.com/) account
- A [Telegram bot](https://t.me/BotFather) (for login)
- A Google Maps API key with Places enabled (optional; manual location fallback without it)

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

Edit `.dev.vars` with your values:

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Long random string for session JWTs |
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Bot username without `@` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps Places API key |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev |

### 3. Database migrations (local)

```bash
npm run db:migrate:local
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000/en](http://localhost:3000/en) or [http://localhost:3000/uz](http://localhost:3000/uz).

---

## Deploy to production (kimkim.uz)

### Cloudflare resources

```bash
# Create D1 database — copy the database_id into wrangler.jsonc
npx wrangler d1 create kimkim-db

# Create R2 bucket for cover images
npx wrangler r2 bucket create kimkim-media
```

### Secrets (production)

Set via Wrangler — **never** in git:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put TELEGRAM_BOT_TOKEN
```

### Google Maps API key (important)

The location picker reads `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Because it runs in the **browser**, this value must be available to the Worker at runtime:

1. Cloudflare dashboard → **Workers & Pages** → `kimkim-uz` → **Settings** → **Variables**
2. Add a **plain-text** variable (not encrypted secret):
   - Name: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - Value: your Google API key
3. Also keep it in `.dev.vars` for local dev and for builds run on your machine.

Do **not** use a different name like `GOOGLE_MAPS_API_KEY` — the app looks for `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exactly.

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), enable **Maps JavaScript API** and **Places API**, then restrict the key by HTTP referrer:

- `https://kimkim.uz/*`
- `https://www.kimkim.uz/*`
- `http://localhost:*/*`

After adding or changing the variable, redeploy: `npm run deploy`.

### Other public vars

`NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` are set in `wrangler.jsonc`. Secrets (`SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`) use `wrangler secret put`.

### Migrate and deploy

```bash
npm run db:migrate:remote
npm run deploy
```

Custom domains `kimkim.uz` and `www.kimkim.uz` are configured in `wrangler.jsonc`. Ensure DNS for the zone points to Cloudflare.

### Telegram bot setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Set the login domain: `/setdomain` → `kimkim.uz`
3. Optional: set Mini App URL to `https://kimkim.uz/en`
4. Register the webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://kimkim.uz/api/telegram/webhook`
5. Register bot commands (menu): `npm run bot:commands` (uses `CRON_SECRET` from `.dev.vars`)
6. Users must **start the bot** (`/start`) to receive DM notifications

### Bot commands (EN / UZ)

The bot detects language from Telegram (`language_code`) or `/lang uz` / `/lang en`.

| Command | What it does |
|---------|----------------|
| `/create` | Guided flow: title → date/time → description → event link |
| `/events` | Lists your upcoming events with links |
| `/help` | Command reference |
| `/cancel` | Stops the current flow |
| `/lang uz` | Switch to Uzbek |

Natural phrases work too: `create event`, `event yarat`, `my events`, `eventlarim`.

### Telegram group announcements

Link a gap/wedding group so KimKim posts joins, schedule changes, and reminders there:

1. On the event **Overview** tab (organizer), open **Telegram group**
2. Tap **Add bot to group**, then send `/link INVITE_CODE` in the group
3. Use **Post invite to group** to share the RSVP link anytime

Group commands: `/link`, `/unlink`, `/event`

### Telegram notifications

KimKim sends Telegram DMs when:

- Someone comments or replies on an event
- A new expense is added
- Someone joins an event
- An event is about to start (24h and 1h reminders)

Reminders run on an hourly cron trigger. Set a secret before deploying:

```bash
wrangler secret put CRON_SECRET
```

Add the same value to `.dev.vars` for local cron testing:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:8787/api/cron/event-reminders
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server (with Cloudflare bindings via OpenNext) |
| `npm run build` | Production Next.js build |
| `npm run preview` | Build + preview in Workers runtime locally |
| `npm run deploy` | Build + deploy to Cloudflare Workers |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:remote` | Apply D1 migrations to production D1 |
| `npm run cf-typegen` | Regenerate Cloudflare binding types |

---

## Project structure

```
src/
├── app/[locale]/          # Localized pages (en, uz)
├── app/api/               # Route handlers (auth, events, media)
├── components/            # UI components
├── i18n/                  # next-intl routing & config
├── lib/                   # Auth, DB queries, expense settlement
messages/                  # en.json, uz.json translations
migrations/                # D1 SQL migrations
wrangler.jsonc             # Cloudflare Worker config
```

---

## Security

- **Do not commit** `.dev.vars`, `.env*`, API tokens, or bot tokens
- `.dev.vars` and `.wrangler/` are gitignored
- Use Wrangler secrets and the Cloudflare dashboard for production credentials
- Restrict your Google Maps API key to `kimkim.uz` and localhost

If you discover a security issue, please report it privately rather than in a public issue.

---

## Roadmap

v1 is complete. Phase 2 priorities (expense edit, ownership transfer, onboarding) are tracked in [ROADMAP.md](./ROADMAP.md).
