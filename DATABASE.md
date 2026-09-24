# Database

PostgreSQL (hosted on Supabase), managed with [Drizzle ORM](https://orm.drizzle.team) and
Drizzle Kit for migrations. Schema lives in `src/db/schema/`, one file per domain, barrelled
through `src/db/schema/index.ts`.

## Connecting

Two connection strings are required (see `.env.example`):

- `DATABASE_URL` — Supabase's **Transaction pooler** connection string. Used by the app at
  runtime (`src/db/client.ts`).
- `DIRECT_URL` — Supabase's **direct** connection string. Used only for running migrations
  (`drizzle.config.ts`), since DDL doesn't work reliably through the transaction pooler.

Both are in Supabase dashboard → Settings → Database.

**Gotcha:** if the DB password contains a literal `$`, escape it as `\$` in `.env.local`.
Next.js's built-in env loader expands unescaped `$VARIABLE` references (a documented
feature, for referencing one env var from another) — an unescaped `$` in a password gets
silently treated as the start of a variable reference and stripped, corrupting the
connection string. All of this project's own scripts (`drizzle.config.ts`,
`src/db/seed/index.ts`, `src/db/scripts/*.ts`) load env via `@next/env`'s `loadEnvConfig`
specifically so they apply the exact same expansion rules as `next dev`/`next build` — don't
swap that for a plain `dotenv` import, or a `$` in a secret will behave differently in
scripts vs. the running app.

## Commands

```bash
pnpm db:generate   # diff schema/*.ts against migration history, write a new SQL migration
pnpm db:migrate    # apply pending migrations to DIRECT_URL
pnpm db:push       # (dev convenience) push schema directly without a migration file
pnpm db:studio     # open Drizzle Studio against DIRECT_URL
pnpm db:seed       # reset and re-insert development seed data
```

## Design decisions

**`profiles` vs Supabase Auth's `auth.users`.** We don't model `auth.users` in Drizzle —
Supabase owns that schema and table. `profiles.id` is the same UUID as the corresponding
`auth.users.id`; the foreign key constraint linking them is added by hand at the bottom of
`src/db/migrations/0000_freezing_magma.sql` (not represented in the TS schema), so
`drizzle-kit generate` never tries to manage Supabase's own schema. Phase 2 added the actual
trigger, as a hand-written custom migration
(`src/db/migrations/0001_auth_user_profile_trigger.sql`, `SECURITY DEFINER` since it fires
on a table this app's DB role doesn't own): `handle_new_user()` inserts the matching
`profiles` row and assigns the default `customer` role the instant someone signs up, and
`handle_user_email_updated()` keeps `profiles.email` in sync if the user changes their email
in Supabase Auth. Application code never creates `profiles` rows directly.

**Roles are a table, not an enum.** `roles` + `user_roles` (rather than a Postgres enum on
`profiles`) so new roles (`manager`, `inventory_manager`, `support`, `marketing`, ...) need a
data insert, not a schema migration — see MasterPlan.txt section 2.

**Authorization is enforced in the application layer, not via Postgres Row Level Security.**
`DATABASE_URL` connects with full table access (that's how Drizzle queries work), so RLS
policies on `public.*` tables would not be enforced against it anyway. Every protected page
and Server Action calls `requireUser`/`requireRole`/`requireAdmin`
(`src/modules/auth/session.ts`), which verifies the session against the Supabase Auth server
and checks `user_roles` before touching data — see MasterPlan.txt section 17 ("Never rely
solely on hiding UI elements").

**Seeding `roles` is an upsert, not a reset.** Unlike every other Phase 1 reference table,
`src/db/seed/index.ts` never deletes `roles` — deleting it would cascade-delete every real
`user_roles` grant (customers' and admins' role assignments), since `roles.id` is
regenerated on insert. `pnpm db:seed` is safe to re-run after Phase 2 for this reason; the
same caution will need to extend to other reference tables once later phases give them real
dependents (e.g. `payment_methods` once Phase 6 orders reference it).

**Fixed-vocabulary statuses are enums.** `order_status`, `payment_status`,
`shipment_status`, `product_status`, `inventory_movement_type`, `discount_type`,
`review_status`, `notification_channel`/`status`, `address_type` are Postgres enums: their
value sets are domain-stable and enums give database-level validation. Adding a new value
later is a normal migration (`ALTER TYPE ... ADD VALUE`).

**Inventory is one row per sellable unit.** `inventory.product_id` XOR `inventory.variant_id`
(enforced by a `CHECK` constraint plus two partial unique indexes) — a variant-less product
gets a `product_id` row, a variant gets a `variant_id` row, never both. Stock is never
decremented directly: every change is also recorded in the append-only
`inventory_movements` ledger (MasterPlan.txt section 7).

**Orders snapshot everything.** `order_items` stores `product_name_snapshot`,
`sku_snapshot`, `variant_label_snapshot`, and the price/discount/tax at time of purchase.
`order_addresses` snapshots the shipping/billing address text rather than pointing live at
`addresses`. This is deliberate duplication so that changing a product's price or a
customer's saved address tomorrow never rewrites history (MasterPlan.txt section 12).

**Cart items keep a display-only price snapshot.** `cart_items.unit_price_snapshot` is for
showing the cart UI without a live product lookup on every render. It is **not** trusted at
checkout — checkout (Phase 6) re-validates product/variant existence, live price,
availability, inventory, and discounts server-side before an order is created
(MasterPlan.txt section 8). It's refreshed to the live price on every cart mutation
(add/quantity update/merge), so it only ever goes stale for an item nobody has touched
since a price changed.

**`cart_items` has the same partial-unique-index pattern as `inventory`:** one unique index
on `(cart_id, product_id) WHERE variant_id IS NULL` and one on
`(cart_id, variant_id) WHERE variant_id IS NOT NULL`. This lets `addToCart` use a single
atomic `INSERT ... ON CONFLICT DO UPDATE` instead of a check-then-write, so two concurrent
"Add to cart" requests for the same item can't create duplicate rows.

**Money is `numeric`, not `float`/`integer` cents.** Avoids floating-point rounding error
without committing to a specific currency's minor-unit convention (PKR has none; other
currencies will).

**Config-driven geography.** `countries`/`states`/`cities` plus `shipping_zone_locations`
(zone ↔ country/state/city) mean no city or province name is hard-coded in application
logic — new cities, or a new country entirely, are data, not code (MasterPlan.txt sections
4 and 13).

**Soft deletion** (`deleted_at`) is used only on rows a user might expect to "undo" or that
have a public-facing detail page: `profiles`, `categories`, `products`, `product_variants`,
`addresses`, `coupons`, `reviews`. Transactional/historical tables (`orders`,
`inventory_movements`, `order_status_history`, `payment_webhooks`, `audit_logs`) are
append-only and never soft-deleted.

**Order creation is one database transaction** (`src/modules/checkout/mutations.ts`,
`placeOrder`): re-validating every cart line's live price/stock, decrementing inventory
(`adjustInventoryTx` — the same transaction-safe, oversell-proof logic from Phase 4, now
exposed as a composable function that takes a transaction handle instead of always opening
its own), inserting the order/order_items/order_addresses/payment/payment_transaction/
order_status_history rows, and clearing the cart all commit or fail together
(MasterPlan.txt section 7). If any line is unavailable or under-stocked, the whole order is
rejected — no partial orders, no phantom stock decrements.

**A guest order's `order_number` doubles as a bearer link.** It has ~32 bits of randomness
(`ORD-YYYYMMDD-XXXXXXXX`), so the confirmation page at `/orders/[orderNumber]` is viewable
without authentication — the same pattern most guest checkouts use for a "thank you" page.
A signed-in customer's order is still ownership-checked (`profileId` match, or admin).
Proper "look up my order by number + email" tracking is Phase 7 (Orders) territory.

## Scope note: what Phase 1 does NOT include

- **COD/payment-method availability rules** (by country/city/zone/order value/product/
  customer history — MasterPlan.txt section 11) are still not modeled as tables as of
  Phase 6. COD is the only active `payment_methods` row and checkout offers it
  unconditionally; per-zone/order-value/customer-history gating is real future work, not
  yet needed with a single payment method and a single active market.
- **Per-country address form requirements** ("address formats" in section 4) are treated as
  UI/validation config, not database rows. The checkout address form is Pakistan-shaped
  (city select, no address line 3, no state free-text — state is derived from the chosen
  city); a second active country would need its own form shape, not just new `cities` rows.
- Seed data only populates reference/config and catalog tables (currencies, countries,
  states, cities, tax rates, roles, payment methods, shipping zones/rates, categories,
  products, variants, inventory, coupons, settings). `profiles`, `addresses`, `carts`,
  `orders`, `reviews`, `wishlists`, and `notifications` all require a real Supabase Auth
  user and are seeded starting in Phase 2+.

## Schema overview

| Domain           | Tables                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reference/config | `currencies`, `countries`, `states`, `cities`, `tax_rates`                                                                                                         |
| Identity         | `profiles`, `roles`, `user_roles`                                                                                                                                  |
| Addresses        | `addresses`                                                                                                                                                        |
| Catalog          | `categories`, `products`, `product_variants`, `product_images`, `product_attributes`, `product_attribute_values`, `variant_attribute_values`, `product_categories` |
| Inventory        | `inventory`, `inventory_movements`                                                                                                                                 |
| Cart             | `carts`, `cart_items`                                                                                                                                              |
| Orders           | `orders`, `order_items`, `order_addresses`, `order_status_history`                                                                                                 |
| Payments         | `payment_methods`, `payments`, `payment_transactions`, `payment_webhooks`                                                                                          |
| Shipping         | `shipping_zones`, `shipping_zone_locations`, `shipping_rates`, `shipments`, `shipment_tracking`                                                                    |
| Coupons          | `coupons`, `coupon_usages`, `coupon_products`, `coupon_categories`                                                                                                 |
| Wishlist         | `wishlists`, `wishlist_items`                                                                                                                                      |
| Reviews          | `reviews`                                                                                                                                                          |
| Notifications    | `notifications`                                                                                                                                                    |
| Misc             | `settings`, `audit_logs`                                                                                                                                           |
