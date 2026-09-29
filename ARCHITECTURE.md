# Architecture

See [`MasterPlan.txt`](./MasterPlan.txt) sections 2–3 for the original spec this
implements. This document describes what was actually built.

## Modular monolith

A single Next.js application, deployed as one unit, internally organized into domain
modules under `src/modules/*` — not a microservices split. MasterPlan.txt section 3 calls
for this explicitly: independent modules with clear boundaries, without the operational cost
of separate services this project doesn't need yet.

```
addresses/     attributes/    auth/          cart/          categories/
checkout/      coupons/       customers/     inventory/     notifications/
orders/        payments/      products/      reviews/       settings/
shipping/      wishlist/      analytics/     admin/
```

Each module owns:

- `queries.ts` — read paths (Drizzle `select`s), used by Server Components.
- `mutations.ts` — write paths (Drizzle `insert`/`update`/transactions), the only place
  business logic touching the database lives.
- `actions.ts` — `"use server"` Server Actions, the boundary Client Components call into.
  Parses/validates `FormData`, calls into `mutations.ts`, never contains business logic
  itself.
- Pure logic extracted to its own file where it doesn't need the database at all (e.g.
  `checkout/totals.ts`, `checkout/tax.ts`, `coupons/discount-math.ts`,
  `inventory/calculations.ts`) — these are unit-tested without touching Postgres; see
  README.md's Testing section.

UI components (`src/components/`, and page components under `src/app/`) render and collect
input only. They never talk to the database directly and never contain business rules —
MasterPlan.txt section 36's "business logic inside UI components" is on the explicit avoid
list.

## Request flow

```
Server Component (page.tsx)
  → module queries.ts (Drizzle select)
  → rendered HTML

Client Component (form)
  → Server Action (module actions.ts)
    → validate input (Zod, src/validations/)
    → rate limit check where the action is abusable (src/lib/rate-limit.ts)
    → module mutations.ts (Drizzle insert/update, transaction where atomicity matters)
    → revalidatePath / redirect
```

Nothing trusts the client: prices, stock, discount amounts, and payment status are always
re-derived from the database inside the mutation, never taken from form input
(MasterPlan.txt section 35). `placeOrder` (`src/modules/checkout/mutations.ts`) is the
clearest example — it re-validates price and stock for every line item and recomputes
totals server-side inside the same transaction that decrements inventory and creates the
order, so nothing about the checkout can be manipulated by tampering with client state.

## Layers

- **`src/app/`** — Next.js App Router routes. Route groups: public storefront
  (`/products`, `/categories`, `/cart`, `/checkout`), customer account (`/account/*`),
  admin (`/admin/*`, gated by `requireAdmin()`), auth (`/login`, `/register`,
  `/forgot-password`, `/update-password`, `/auth/callback`).
- **`src/modules/`** — domain logic, described above.
- **`src/db/`** — Drizzle client (`client.ts`), schema (`schema/*.ts`, one file per domain,
  barrelled through `schema/index.ts`), migrations, seed script. See
  [`DATABASE.md`](./DATABASE.md).
- **`src/lib/`** — cross-cutting utilities with no domain ownership (`money.ts` rounding,
  `rate-limit.ts`).
- **`src/validations/`** — Zod schemas shared between Server Actions and (where relevant)
  client-side form feedback.
- **`src/config/`** — market defaults and static configuration (currency, locale).
- **`tests/`**, **`e2e/`** — test helpers and Playwright specs; see README.md's Testing
  section.

## Authentication & authorization

Supabase Auth issues sessions (email/password); the app's own `profiles` table mirrors
`auth.users` by ID (a real Postgres FK, not a soft reference) and `roles`/`user_roles`
assign roles (`customer`, `admin`) via a DB trigger on signup. `getCurrentUser()` /
`requireRole()` / `requireAdmin()` (`src/modules/auth/session.ts`) are the only way any
Server Action or Server Component should establish identity — never read a role or user ID
out of client-supplied form data. See DATABASE.md's design decisions for why `auth.users`
itself isn't modeled in Drizzle.

## Payments

Cash-on-Delivery is the only implemented payment method — a real production option for this
market, not a placeholder. The `payment_methods` / `payments` / `payment_transactions`
schema is provider-agnostic by design (MasterPlan.txt section 10) so an online gateway can
be added as a second provider later without a schema change; no fake gateway integration or
simulated payment success was built (section 35 forbids exactly that).

## Notifications & analytics

Both are provider-agnostic abstractions (`src/modules/notifications`,
`src/modules/analytics`) that write their own table (`notifications`, `analytics_events`)
regardless of provider, and swap the outbound side based on environment variables — email
logs to the console until `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are set, analytics is
self-hosted only (no third-party provider configured). See DATABASE.md's Phase 12/13 scope
notes for the reasoning.

## Production hardening (Phase 15)

- **Indexes**: every foreign-key column that's queried directly (order lookups by profile,
  address lookups by profile, order items/addresses/status-history by order, etc.) has an
  explicit `index()` — Postgres does not auto-index foreign keys, only primary keys and
  unique constraints. See DATABASE.md's Phase 15 scope note for the full list.
- **Rate limiting**: `src/lib/rate-limit.ts`, a DB-backed fixed-window limiter
  (`rate_limit_attempts` table). Deliberately not in-memory — Vercel serverless functions
  don't share process memory across invocations, so an in-memory limiter would silently do
  nothing in production. Applied to `applyCouponAction` (10/5min per IP — coupon codes are
  guessable), `placeOrderAction` (5/10min per IP), and `submitReviewAction` (20/hour per
  user).
- **Security headers**: `next.config.ts`'s `headers()` sets `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and
  `Strict-Transport-Security` on every route. No `Content-Security-Policy` yet — see
  DATABASE.md's Phase 15 scope note for why that's a disclosed gap rather than a blind
  guess.
- **Error boundaries**: `src/app/not-found.tsx` (404), `src/app/error.tsx` (route-level
  error boundary, Client Component), `src/app/global-error.tsx` (root-layout-level
  failure — renders its own `<html>/<body>`, since a broken root layout is the one failure
  case a normal `error.tsx` can't catch).
- **Testing**: see README.md's Testing section and DATABASE.md's Phase 14 scope note —
  unit + integration (rollback) + E2E, all run as part of the pre-deploy checklist in
  [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Deliberately deferred

Tracked in DATABASE.md's per-phase scope notes rather than repeated here: shipping-zone
admin UI, a `settings` admin UI, `audit_logs` writes, Content-Security-Policy, an online
payment gateway, and automated testing of real Supabase Auth signup/login.
