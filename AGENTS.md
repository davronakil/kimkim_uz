# Agent notes (KimKim.uz)

Quick orientation for AI assistants working in this repo.

## Stack

- Next.js 16 App Router, React 19, Tailwind 4, next-intl
- Deployed on **Cloudflare Workers** via `@opennextjs/cloudflare` — not Vercel
- D1 (SQLite), R2 (media), hourly cron for reminders

## Locales

`en`, `uz`, `ru` — config in `src/i18n/config.ts`, messages in `messages/*.json`. Default locale is **`uz`**; first-visit browser detection with a persistent cookie.

Bot strings are separate: `src/lib/telegram/i18n.ts`.

## Do not commit

- `.dev.vars` (secrets)
- Real API keys or bot tokens

## Common tasks

| Task | Command / path |
|------|----------------|
| Local dev | `npm run dev` → http://localhost:3000/uz |
| Migrate DB | `npm run db:migrate:local` |
| Deploy | `npm run deploy` |
| Bot webhook | `src/app/api/telegram/webhook/route.ts` |
| Add migration | `migrations/NNNN_name.sql` then migrate remote |

## Conventions

- Event DB queries: `src/lib/db/queries.ts`
- Catalog DB queries: `src/lib/db/catalog-queries.ts`
- Event creation: `src/lib/events/create.ts`
- Expense creation: `src/lib/expense/create.ts`
- Telegram handler: `src/lib/telegram/handler.ts`
- OG images: cover → map → generated card (`src/lib/og/`)
- Platform admin / superadmin: `src/lib/platform/admin.ts` (`davron_tx`)
- Admin UI: `src/components/admin/admin-workspace.tsx`

## Public pages

- `/discover` — public events (`visibility = public`)
- `/catalog` — approved business listings with community vouches

## Docs

- [README.md](./README.md) — overview & getting started
- [docs/CATALOG.md](./docs/CATALOG.md) — business directory & vouches
- [docs/TELEGRAM.md](./docs/TELEGRAM.md) — bot & notifications
- [docs/DATABASE.md](./docs/DATABASE.md) — schema & migrations
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — production checklist
- [ROADMAP.md](./ROADMAP.md) — what's shipped / what's next
