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
| `/catalog` | Public | Browse approved listings (map/list, search, category filters in URL) |
| `/catalog/[id]` | Public (approved) | Business detail, vouch, share, related listings |
| `/catalog/submit` | Logged in | New listing (requires available slot) |
| `/catalog/manage` | Logged in | Manage listings, buy extra slots |
| `/admin` | Platform admin | Tabbed dashboard: overview, catalog review (approve/reject/unpublish/republish), events, users, admins |

## Discovery & sharing

- **Homepage** — top-vouched featured listings when approved listings exist
- **Browse** — “Most vouched” and “Recently added” rails; category chips sync to `?category=` (shareable URLs)
- **Detail** — related businesses in the same category; copy link / Telegram / native share
- **SEO** — category-filtered catalog pages get dedicated titles/descriptions; listings in `sitemap.xml` with `LocalBusiness` JSON-LD

## SEO

Approved listings are indexable public pages. They are added to `sitemap.xml` and include `LocalBusiness` JSON-LD on the detail page. Pending and rejected listings are not publicly indexable.

## Categories

Defined in `src/lib/catalog/categories.ts` with labels in `messages/*.json` under `catalog.categories`.

Examples: restaurant, banquet hall, event venue, sauna / banya, photographer, DJ, dacha, hotel, and more.

Legacy slug `wedding_venue` is migrated to `event_venue` (migration `0015`).

## Admin & superadmin

- **Superadmin** — Telegram username `davron_tx` (hardcoded in `src/lib/platform/admin.ts`); auto-promoted on first admin check.
- **Superadmin catalog powers** — unlimited business listings; new submissions publish immediately (no admin review queue).
- **Admins** — granted by superadmin; can approve, reject, unpublish, or republish catalog listings.
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
| UI | `src/components/catalog/*` (browse: `catalog-browser.tsx`) |

## Database

See [DATABASE.md](./DATABASE.md) for tables (`0013`, `0014` migrations).
