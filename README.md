# my-store

A production ecommerce platform for the Pakistan market, architected to extend to
international markets without a rewrite. See [`MasterPlan.txt`](./MasterPlan.txt) for the
full product/technical specification and phase plan.

**Status:** Phase 1 — Database. Schema, migrations, and seed data exist; no commerce
UI/business logic yet.

## Tech stack

- Next.js (App Router) + TypeScript + React
- Tailwind CSS + shadcn/ui
- PostgreSQL (Supabase) + Drizzle ORM
- Supabase Auth — added in Phase 2

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

## Testing

Not yet implemented — see Phase 14 in `MasterPlan.txt`.

## Scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `pnpm dev`          | Start the dev server              |
| `pnpm build`        | Production build                  |
| `pnpm start`        | Start the production server       |
| `pnpm lint`         | Run ESLint                        |
| `pnpm typecheck`    | Run the TypeScript compiler       |
| `pnpm format`       | Format the codebase with Prettier |
| `pnpm format:check` | Check formatting without writing  |
| `pnpm db:generate`  | Generate a Drizzle migration      |
| `pnpm db:migrate`   | Apply migrations                  |
| `pnpm db:seed`      | Reset and load seed data          |
| `pnpm db:studio`    | Open Drizzle Studio               |

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
