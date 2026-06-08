# KimKim.uz

**[kimkim.uz](https://kimkim.uz)** — plan gatherings with friends, discuss in threaded comments, split expenses automatically, and sign in with Telegram.

Built for **English** and **Oʻzbek** speakers, deployed on Cloudflare Workers.

---

## Features

- **Events** — title, description, date & time, Google Maps location, cover image
- **Threaded comments** — nested, Reddit-style discussion on each event
- **Expense splitting** — log who paid what; see who owes whom with minimal transfers
- **Telegram-native auth** — Login Widget + Mini App support, share events back to chats
- **True bilingual UI** — switch between English and Uzbek at any time (`/en`, `/uz`)

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

Set `NEXT_PUBLIC_*` variables in the Cloudflare Workers dashboard under **Settings → Variables**, or in your CI build environment.

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

- [ ] Invite links + join flow for event members
- [ ] Telegram bot notifications (reminders, new comments)
- [ ] Custom / unequal expense splits
- [ ] Event editing and cover image cropping
- [ ] PWA + offline event details
