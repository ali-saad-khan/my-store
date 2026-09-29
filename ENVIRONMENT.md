# Environment variables

Authoritative reference for every environment variable the app uses. `.env.example` is kept
in sync and is what you copy locally; this document explains what each one is for, where to
get it, and which environments need it. Never commit `.env.local` or any file with real
secrets.

## App

| Variable               | Required | Example                 | Notes                                                                                  |
| ---------------------- | -------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`  | Yes      | `http://localhost:3000` | Used to build absolute URLs (email links, sitemap, canonical/OG tags, Supabase redirect). In production, set to the real deployed URL. |

## Database (Supabase PostgreSQL via Drizzle)

Both come from Supabase dashboard → Settings → Database → Connection string.

| Variable       | Required | Notes |
| -------------- | -------- | ----- |
| `DATABASE_URL` | Yes      | The **Transaction pooler** connection string. Used by the running app (`src/db/client.ts`). |
| `DIRECT_URL`   | Yes      | The **direct** connection string. Used only for migrations (`drizzle.config.ts`) — DDL isn't reliable through the transaction pooler. |

**Gotcha:** if the DB password contains a literal `$`, escape it as `\$`. Next.js's env
loader expands unescaped `$VARIABLE` references; an unescaped `$` in a password is silently
treated as the start of a variable reference and stripped. See DATABASE.md's Connecting
section for the full explanation and why this project's scripts all load env via
`@next/env` rather than plain `dotenv`.

Separate Supabase projects (and therefore separate values for both of these) should be used
for development/staging vs. production — never point a production deploy at the same
database used for local development or testing.

## Supabase Auth

Both come from Supabase dashboard → Settings → API.

| Variable                        | Required | Notes |
| -------------------------------- | -------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Yes      | Project URL. Public — safe to expose to the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Yes      | Anon/public key. Public — Postgres Row Level Security (not this key) is what actually protects data. |

There is no `SUPABASE_SERVICE_ROLE_KEY` in this app — nothing server-side needs to bypass
RLS. If a future feature seems to need it, treat that as a signal to double-check the RLS
policy first rather than reaching for the service-role key (MasterPlan.txt section 35:
never expose/misuse a service-role key).

**Supabase dashboard config required alongside these** (Authentication → URL
Configuration), so email confirmation/reset links redirect back to this app:

- **Site URL**: same value as `NEXT_PUBLIC_APP_URL`.
- **Redirect URLs**: `<NEXT_PUBLIC_APP_URL>/auth/callback` — add both the local
  (`http://localhost:3000/auth/callback`) and production URL as separate entries; Supabase
  needs each one listed explicitly.

## Transactional email (Resend)

| Variable            | Required | Notes |
| -------------------- | -------- | ----- |
| `RESEND_API_KEY`     | No (dev) / Yes (prod) | From resend.com dashboard. |
| `RESEND_FROM_EMAIL`  | No (dev) / Yes (prod) | Must be a verified sender/domain in Resend. |

When either is unset, `src/modules/notifications` logs the email to the console instead of
sending it — this is how development works today, since no Resend account exists yet for
this project (disclosed gap, not a bug — MasterPlan.txt section 35). Every send is still
recorded in the `notifications` table regardless of which path is taken. **Both must be set
before declaring production deployment complete** — see DEPLOYMENT.md's checklist.

## Per-environment summary

| Variable                        | Local dev                     | Production                              |
| -------------------------------- | ------------------------------ | ---------------------------------------- |
| `NEXT_PUBLIC_APP_URL`            | `http://localhost:3000`       | Real deployed URL (`https://...`)        |
| `DATABASE_URL` / `DIRECT_URL`    | Dev Supabase project           | **Separate** production Supabase project |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dev Supabase project | Production Supabase project |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Unset (console logging) | Set (real sends)                    |

Set production values in Vercel → Project → Settings → Environment Variables, scoped to the
Production environment (and separately to Preview if preview deploys should also talk to a
real — ideally non-production — database). See [`DEPLOYMENT.md`](./DEPLOYMENT.md).
