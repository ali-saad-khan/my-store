# my-store

A production ecommerce platform for the Pakistan market, architected to extend to
international markets without a rewrite. See [`MasterPlan.txt`](./MasterPlan.txt) for the
full product/technical specification and phase plan.

**Status:** Phase 8 — Admin. Categories, products, variants, and a storefront (listing,
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
searchable customer list — all behind a shared nav shell. Coupons, reviews,
a shipping-zone admin UI, settings, and audit logs are deliberately deferred
(see DATABASE.md). No online payment gateway yet.

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

Not yet implemented — see Phase 14 in `MasterPlan.txt`.

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
```

Each module under `src/modules/` owns its own domain logic; UI components should not
contain business logic directly.

## Production deployment

Not yet implemented — see Phase 15 in `MasterPlan.txt`. Target platform is Vercel, with
Supabase PostgreSQL and Cloudflare for DNS/security.
