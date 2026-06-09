# Business catalog

KimKim includes a **Yelp-style business directory** at `/[locale]/catalog` where people discover local businesses and service providers.

## How it works

| Step | Who | What |
|------|-----|------|
| Submit | Logged-in user | Adds a business (name, category, location, contacts, cover). One free listing slot per account; extra slots via Stripe. |
| Review | Platform admin | Approves or rejects submissions at `/[locale]/admin`. |
| Publish | System | Approved listings appear in the public catalog, sorted by **community vouches** then publish date. |
| Vouch | Logged-in user | One vouch per listing — a public recommendation (“I trust this place”). Cannot vouch for your own listing. |

## Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/catalog` | Public | Browse approved listings by category |
| `/catalog/[id]` | Public (approved) | Business detail + vouch button |
| `/catalog/submit` | Logged in | New listing (requires available slot) |
| `/catalog/manage` | Logged in | Manage listings, buy extra slots |
| `/admin` | Platform admin | Review pending listings; superadmin manages admins |

## Categories

Defined in `src/lib/catalog/categories.ts` with labels in `messages/*.json` under `catalog.categories`.

Examples: restaurant, banquet hall, event venue, sauna / banya, photographer, DJ, dacha, hotel, and more.

Legacy slug `wedding_venue` is migrated to `event_venue` (migration `0015`).

## Admin & superadmin

- **Superadmin** — Telegram username `davron_tx` (hardcoded in `src/lib/platform/admin.ts`); auto-promoted on first admin check.
- **Superadmin catalog powers** — unlimited business listings; new submissions publish immediately (no admin review queue).
- **Admins** — granted by superadmin; can approve/reject catalog submissions from other users.
- Superadmin cannot be removed via the admin UI.

## Stripe extra slots

Optional env vars (see `.dev.vars.example`):

- `BUSINESS_EXTRA_SLOT_PRICE_CENTS` (default `500000`)
- `BUSINESS_EXTRA_SLOT_CURRENCY` (default `UZS`)

Checkout metadata: `purchase_type: business_slot`. Fulfillment in `src/lib/stripe/fulfill-business-slot.ts`.

## Code map

| Area | Path |
|------|------|
| DB queries | `src/lib/db/catalog-queries.ts` |
| Form validation | `src/lib/catalog/form.ts` |
| Categories | `src/lib/catalog/categories.ts` |
| Platform admin | `src/lib/platform/admin.ts` |
| Vouch API | `POST /api/catalog/[id]/vouch` |
| UI | `src/components/catalog/*` |

## Database

See [DATABASE.md](./DATABASE.md) for tables (`0013`, `0014` migrations).
