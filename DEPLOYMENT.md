# Deployment

Target stack (MasterPlan.txt section 2): **Vercel** (app), **Supabase PostgreSQL**
(database), **Cloudflare** (DNS/security). This document has not yet been exercised against
a real Vercel project for this app — follow it carefully and verify each step rather than
assuming it's correct (MasterPlan.txt section 35: never claim an integration works without
testing it).

## Prerequisites

- A **separate** Supabase project for production — never point production at the dev/test
  database used during development (see ENVIRONMENT.md).
- A Vercel account/team with access to import this repository.
- A Resend account with a verified sending domain, if transactional email is going live
  alongside this deploy (optional — see ENVIRONMENT.md).
- A domain, if using Cloudflare for DNS.

## 1. Provision production Supabase

1. Create a new Supabase project (separate from dev).
2. Run migrations against it: set `DIRECT_URL` locally (or in CI) to the production
   project's direct connection string and run `pnpm db:migrate`. Do **not** run
   `pnpm db:push` against production — that bypasses the migration history.
3. Decide on seed data: `pnpm db:seed` resets and loads *development* fixture data (test
   products, a test admin) — do not run it against production. Production needs its own
   real catalog data and admin account instead.
4. Grant the admin role to a real account once it's registered:
   `pnpm admin:promote <email>` (pointed at the production `DATABASE_URL`).
5. Configure Authentication → URL Configuration in the production Supabase project: Site
   URL and Redirect URLs, per ENVIRONMENT.md's Supabase Auth section — using the production
   app URL, not `localhost`.

## 2. Configure Vercel

1. Import the repository into a new Vercel project.
2. Framework preset: Next.js (auto-detected).
3. Set every environment variable from ENVIRONMENT.md's table under Project → Settings →
   Environment Variables, scoped to **Production** (and separately to **Preview**, if
   preview deployments should also run against a database — ideally not the same production
   one).
4. Build command / output: Vercel's Next.js defaults; nothing custom is needed.

## 3. Configure Cloudflare (DNS/security)

1. Point the domain's DNS at Vercel (per Vercel's own domain-configuration instructions for
   the account's plan).
2. If proxying through Cloudflare (orange-cloud), verify SSL/TLS mode is **Full (strict)**
   so the Vercel↔Cloudflare hop stays encrypted, not just the browser↔Cloudflare hop.
3. Cloudflare is DNS/edge security here, not a replacement for the app-level security
   headers already set in `next.config.ts` (see ARCHITECTURE.md's Production hardening
   section) — both apply.

## 4. Pre-deploy checklist

Run all of these locally before pushing to the branch Vercel deploys from — this mirrors
MasterPlan.txt section 37's final production requirement list:

```bash
pnpm typecheck
pnpm lint
pnpm test              # unit
pnpm test:integration   # integration (rolled back, safe against the dev DB)
pnpm build
pnpm test:e2e           # against a running dev server, dev DB — creates real data, see README.md
```

All must pass. Fix, don't skip — MasterPlan.txt section 35 forbids disabling checks to make
something work.

## 5. Post-deploy verification

Manually verify against the live production URL (automated E2E targets the dev server, not
production, since it's allowed to create real orders):

- [ ] Homepage and `/products` load, images render
- [ ] Sign up / log in works, and the Supabase email link redirects back to the production
      URL (not `localhost`) — confirms Site URL/Redirect URLs were set correctly
- [ ] A full guest checkout (COD) succeeds and the order shows up in `/admin/orders`
- [ ] Order confirmation email actually arrives (confirms `RESEND_API_KEY`/
      `RESEND_FROM_EMAIL` are live, not console-logging)
- [ ] `/sitemap.xml` and `/robots.txt` resolve and reference the production URL, not
      `localhost`
- [ ] Security headers are present: `curl -I <production-url>` and check for
      `x-frame-options`, `strict-transport-security`, etc.
- [ ] Rate limiting still triggers in production (same manual check described in
      DATABASE.md's Phase 15 scope note) — confirms `rate_limit_attempts` is being written
      to the production database, not silently no-op'd

## Rollback

Vercel keeps every deployment; use its dashboard to instantly re-promote a previous
deployment if a new one breaks production. Database migrations are additive-by-default in
this project so far (new tables/indexes/columns, no destructive changes) — if a future
migration is destructive, write and test its down-migration before deploying it.
