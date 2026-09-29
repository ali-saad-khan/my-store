# API

This app has **no public REST/JSON API**. Data access happens through:

- **Server Components** reading directly via module `queries.ts` functions (Drizzle
  `select`s), rendered to HTML on the server — there's no client-side data-fetching layer
  calling an API route.
- **Server Actions** (`"use server"` functions in each module's `actions.ts`) for all
  writes, called directly from forms/Client Components via Next.js's built-in
  Server Actions transport — not hand-rolled HTTP endpoints.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md)'s Request flow section for how these fit
together, and each module's `actions.ts` for the full list of available actions (one export
per user-facing operation — e.g. `placeOrderAction`, `applyCouponAction`,
`submitReviewAction`).

## Route handlers

The only `route.ts` in the app:

| Route                | Purpose |
| --------------------- | ------- |
| `/auth/callback`     | Supabase Auth's OAuth/email-link redirect target — exchanges a code for a session, then redirects into the app. Not a general-purpose API endpoint and not meant to be called directly. |

## Machine-readable endpoints

Not an API in the request/response sense above, but worth listing since they're publicly
fetchable URLs generated from live data:

| Route            | Purpose |
| ------------------ | ------- |
| `/sitemap.xml`    | Generated from the live product/category catalog, hourly-revalidated. |
| `/robots.txt`     | Excludes private routes (admin, account, cart, checkout, order confirmation). |

## If a public API becomes necessary later

Nothing currently depends on one — there's no mobile app, third-party integration, or
partner that needs programmatic access. If one is added, it should live under
`src/app/api/*` as versioned route handlers, reuse the same module `queries`/`mutations`
functions the rest of the app already uses (so business rules aren't duplicated), and get
its own authentication scheme (e.g. API keys or OAuth) independent of the cookie-based
session Server Actions rely on — this document should be rewritten to describe it in full
once that happens, per MasterPlan.txt section 32.
