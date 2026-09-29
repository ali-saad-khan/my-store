# my-store

A production ecommerce platform for the Pakistan market, architected to extend to
international markets without a rewrite. See [`MasterPlan.txt`](./MasterPlan.txt) for the
full product/technical specification and phase plan.

**Status:** Phase 15 — Production hardening (final phase). Categories, products, variants, and a storefront (listing,
search/filter/sort/pagination, product detail pages) are live. Stock is tracked per
product/variant with an append-only movement ledger; admins can view stock levels, filter
for low stock, and apply transaction-safe manual adjustments at `/admin/inventory`. Guests
and signed-in customers can add products/variants to a persistent cart at `/cart`, update
quantities, and remove items — server-validated against live price/stock on every mutation.
A guest's cart merges into their account automatically on sign-in. `/checkout` collects
contact info, a delivery address (saved or new, data-driven city/shipping-zone resolution),
and a shipping method, then places a Cash-on-Delivery order atomically: live price/stock
re-validation, inventory decrement, order/payment/address snapshots, and cart clearing all
happen in one database transaction. Orders move through a full status lifecycle (pending →
confirmed → processing → packed → shipped → out for delivery → delivered, plus
cancel/return/refund) at `/admin/orders`, with inventory restocked and COD payment
settled automatically on each transition; customers can view order history at
`/account/orders` and self-cancel an unfulfilled order. The admin area
(`/admin`) has a real dashboard (revenue, orders, customers, products sold,
low-stock, pending orders, recent orders) and full CRUD for products
(including variants and their own inventory), categories, and a
searchable customer list — all behind a shared nav shell. A customer can apply a coupon
code on the cart or checkout page (percentage/fixed, min order value, max discount cap,
usage limits, per-customer limits, product/category restriction, active window) — the
discount is re-validated server-side on every view and again inside the checkout
transaction, and admins manage coupons at `/admin/coupons`. Signed-in customers can rate
and review a product (one review per customer per product, edited in place, re-queued for
moderation on every edit) directly on the product page — reviews only show publicly once an
admin approves them at `/admin/reviews`, and a review earns a "verified purchase" badge when
it matches a delivered order. Customers can also save products to a wishlist from the
product page and manage the full list at `/account/wishlist`. Product and category pages
carry canonical URLs, OpenGraph/Twitter metadata, and JSON-LD (Product + AggregateRating +
BreadcrumbList) structured data; `/sitemap.xml` (hourly-revalidated) and `/robots.txt` are
generated from the live catalog, and private routes (admin, account, cart, checkout, order
confirmation) are excluded via both `robots.txt` and a `noindex` meta tag. Transactional
emails (order confirmation, order status updates including COD payment settlement, and
admin low-stock alerts) go through a provider-agnostic abstraction
(`src/modules/notifications`) that logs to the console in development (no Resend account
exists for this project) and switches to Resend automatically once `RESEND_API_KEY`/
`RESEND_FROM_EMAIL` are set — every send is recorded in the `notifications` table regardless
of provider. Behavioral analytics events (product views/searches, cart/checkout funnel,
orders, wishlist adds) are tracked through a self-hosted abstraction
(`src/modules/analytics`) into an `analytics_events` table, with admins reviewing event
counts and the most-viewed products over the last 30 days at `/admin/analytics`. Business
logic that used to be inlined inside DB-touching functions (order totals, tax-rate
selection, coupon discount math, inventory quantity math) was extracted into pure,
unit-tested functions; `pnpm test` runs 36 unit tests, `pnpm test:integration` runs 18
integration tests against the real dev DB inside transactions that always roll back (zero
trace left), and `pnpm test:e2e` runs a Playwright end-to-end test of the full critical path
(browse → cart → COD checkout → admin updates status → customer sees it) — see the Testing
section below and DATABASE.md's Phase 14 scope note. Production hardening is now in place:
every foreign-key column that's actually queried has an explicit index (Postgres doesn't
auto-index them), coupon application/order placement/review submission are all protected by
DB-backed rate limiting (verified live against the running app, not just in tests — see
DATABASE.md's Phase 15 scope note), `next.config.ts` sets conservative security headers, and
`not-found.tsx`/`error.tsx`/`global-error.tsx` give the app real error boundaries instead of
Next's defaults. A shipping-zone admin UI, settings, and audit logs are deliberately
deferred, and there's no online payment gateway yet or Content-Security-Policy (see
DATABASE.md's scope notes for why). See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how it's
all put together, [`ENVIRONMENT.md`](./ENVIRONMENT.md) for the full environment variable
reference, and [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the Vercel/Supabase/Cloudflare
deployment procedure and pre/post-deploy checklists.

## Tech stack

- Next.js (App Router) + TypeScript + React
- Tailwind CSS + shadcn/ui
- PostgreSQL (Supabase) + Drizzle ORM
- Supabase Auth

## Prerequisites

- Node.js 20+
- pnpm (`corepack enable` or `npm install -g pnpm`)

## Installation

```bash
pnpm install
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. `.env.example` is kept in
sync with whatever the current phase actually needs — see it for the authoritative list.
Never commit `.env.local`.

```bash
cp .env.example .env.local
```

## Local development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database & migrations

See [`DATABASE.md`](./DATABASE.md) for schema design decisions and the full table list.

```bash
pnpm db:generate   # generate a migration from the schema
pnpm db:migrate    # apply migrations
pnpm db:seed       # reset and load development seed data
pnpm db:studio     # browse the database in Drizzle Studio
```

## Authentication

Supabase Auth handles email/password sign-up, login, logout, password reset, and email
verification. Roles (`customer`, `admin`, ...) live in the app database (`roles`/
`user_roles`), auto-assigned on signup by a DB trigger — see
[`DATABASE.md`](./DATABASE.md#design-decisions).

**Required Supabase dashboard config** (Authentication → URL Configuration), so email
confirmation/reset links redirect back to this app:

- **Site URL**: `NEXT_PUBLIC_APP_URL` (`http://localhost:3000` in dev)
- **Redirect URLs**: add `<NEXT_PUBLIC_APP_URL>/auth/callback` (e.g.
  `http://localhost:3000/auth/callback`, plus your production URL once deployed)

There's no self-serve admin signup. To grant the admin role to an already-registered
account:

```bash
pnpm admin:promote user@example.com
```

## Product catalog

- `/products` — full catalog, with search (`q`), price range (`minPrice`/`maxPrice`), sort
  (`sort`), and pagination (`page`) — all URL-driven query params, no client JS required.
- `/products/[slug]` — product detail page; products with variants (e.g. Size/Color) get an
  interactive variant selector that updates price/SKU/stock without a page reload.
- `/categories` and `/categories/[slug]` — category browsing, reusing the same
  search/filter/sort/pagination as `/products`, scoped to that category.

Search is a simple `ILIKE` match on name/short description — fine for the current catalog
size. If the catalog grows enough for this to matter, swap it for Postgres full-text search
(a generated `tsvector` column + GIN index) rather than optimizing prematurely now.

Product/category domain logic lives in `src/modules/products/` and
`src/modules/categories/`, not in the page components.

## Testing

Three layers, per MasterPlan.txt section 28:

```bash
pnpm test              # unit tests (Vitest) — pure functions, no DB, fast
pnpm test:watch        # unit tests in watch mode
pnpm test:integration  # integration tests (Vitest) — real dev DB, always rolled back
pnpm test:e2e          # E2E tests (Playwright) — real browser, real dev server
```

- **Unit tests** (`src/**/*.test.ts`, colocated with the code they test) cover pricing,
  discounts/coupon rules, shipping-cost calculation, tax-rate selection, order totals, and
  inventory quantity math — all extracted into pure functions specifically so they're
  testable without a database.
- **Integration tests** (`src/**/*.integration.test.ts`) exercise real mutation functions
  (`placeOrder`, `transitionOrderStatus`, `adjustInventoryTx`, `validateCoupon`,
  `getUserRoles`) against the actual dev Supabase Postgres database — there's no separate
  test database. Every test runs inside a transaction that's always rolled back
  (`tests/helpers/db.ts`'s `withRollback`), so nothing is ever left behind; verified live by
  querying the DB after a full run and confirming zero leftover rows. This only works for
  functions that accept an optional trailing transaction client (`placeOrder`,
  `transitionOrderStatus`, `cancelOrderAsCustomer`, `getUserRoles` all do) — see
  DATABASE.md's Phase 14 scope note before adding a new integration test.
- **E2E tests** (`e2e/*.spec.ts`) drive a real Chromium browser against a real running dev
  server and this same dev database — unlike integration tests, these **do create real
  data** (a real order, in `critical-path.spec.ts`), the same as manual phase-by-phase
  testing throughout this project. `pnpm test:e2e` starts `pnpm dev` for you if it isn't
  already running.

Real Supabase Auth signup/login isn't covered by automated tests (no real inbox to confirm
a new signup with, and Auth is an external service that can't be rolled back with the rest
of a transaction) — the integration suite instead covers the authorization layer
(`getUserRoles`) that `requireRole`/`requireAdmin` gate on, and E2E logs in with an existing
disclosed test account rather than signing one up.

## Scripts

| Command              | Description                       |
| -------------------- | --------------------------------- |
| `pnpm dev`           | Start the dev server              |
| `pnpm build`         | Production build                  |
| `pnpm start`         | Start the production server       |
| `pnpm lint`          | Run ESLint                        |
| `pnpm typecheck`     | Run the TypeScript compiler       |
| `pnpm format`        | Format the codebase with Prettier |
| `pnpm format:check`  | Check formatting without writing  |
| `pnpm test`          | Run unit tests                    |
| `pnpm test:watch`    | Run unit tests in watch mode      |
| `pnpm test:integration` | Run integration tests (real dev DB, rolled back) |
| `pnpm test:e2e`      | Run Playwright E2E tests           |
| `pnpm db:generate`   | Generate a Drizzle migration      |
| `pnpm db:migrate`    | Apply migrations                  |
| `pnpm db:seed`       | Reset and load seed data          |
| `pnpm db:studio`     | Open Drizzle Studio               |
| `pnpm admin:promote` | Grant the admin role to an email  |

## Project structure

```text
src/
├── app/           # Next.js App Router routes
├── components/    # Shared UI components (shadcn/ui lives in components/ui)
├── modules/       # Domain modules (auth, products, cart, orders, ...)
├── db/            # Database client, schema, migrations, seed
├── lib/           # Cross-cutting utilities
├── hooks/         # Shared React hooks
├── types/         # Shared TypeScript types
├── config/        # App configuration (market defaults, feature flags, ...)
└── validations/   # Shared Zod schemas

tests/             # Integration-test helpers (rollback wrapper, DB fixtures)
e2e/               # Playwright end-to-end specs
```

Each module under `src/modules/` owns its own domain logic; UI components should not
contain business logic directly.

## Production deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full Vercel + Supabase + Cloudflare
deployment procedure, including a pre-deploy checklist (typecheck/lint/tests/build) and a
post-deploy manual verification checklist. Not yet actually deployed for this project — the
document has not been exercised against a real Vercel project yet, so verify each step
rather than assuming it's correct.
