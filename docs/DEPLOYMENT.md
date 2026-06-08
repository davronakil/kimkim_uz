# Deployment checklist

Production target: **https://kimkim.uz** on Cloudflare Workers via OpenNext.

## One-time setup

1. **D1** — `npx wrangler d1 create kimkim-db` → copy `database_id` into `wrangler.jsonc`
2. **R2** — `npx wrangler r2 bucket create kimkim-media`
3. **Secrets** (never commit):
   ```bash
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put CRON_SECRET
   npx wrangler secret put STRIPE_SECRET_KEY      # if using paid events
   npx wrangler secret put STRIPE_WEBHOOK_SECRET  # if using paid events
   ```
4. **Plain-text Worker variables** (dashboard → Settings → Variables):
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
5. **DNS** — zone `kimkim.uz` on Cloudflare; routes in `wrangler.jsonc`
6. **Telegram** — BotFather `/setdomain` → `kimkim.uz`; set webhook (see [TELEGRAM.md](./TELEGRAM.md))
7. **Stripe** — webhook endpoint `https://kimkim.uz/api/stripe/webhook` (paid events + catalog slot purchases)

## Every release

```bash
npm run db:migrate:remote   # if new migrations
npm run build               # optional sanity check
npm run deploy
```

## Environment reference

| Variable | Where | Required |
|----------|-------|----------|
| `SESSION_SECRET` | Wrangler secret | Yes |
| `TELEGRAM_BOT_TOKEN` | Wrangler secret | Yes |
| `CRON_SECRET` | Wrangler secret | Yes (reminders) |
| `STRIPE_SECRET_KEY` | Wrangler secret | Paid events + catalog extra slots |
| `STRIPE_WEBHOOK_SECRET` | Wrangler secret | Paid events + catalog extra slots |
| `BUSINESS_EXTRA_SLOT_PRICE_CENTS` | Wrangler secret / `.dev.vars` | Optional catalog slot price (default 500000) |
| `BUSINESS_EXTRA_SLOT_CURRENCY` | Wrangler secret / `.dev.vars` | Optional (default UZS) |
| `NEXT_PUBLIC_APP_URL` | `wrangler.jsonc` | Yes |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | `wrangler.jsonc` | Yes |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Worker variable + `.dev.vars` | Optional (manual location fallback) |

Local development: copy `.dev.vars.example` → `.dev.vars`.

## Cron

`wrangler.jsonc` defines hourly cron (`0 * * * *`) → `worker-scheduled.mjs` → event reminders.

## Observability

Cloudflare Workers observability is enabled in `wrangler.jsonc`. Check logs in the dashboard for webhook errors, Stripe failures, and OG generation issues.
