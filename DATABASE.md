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
`drizzle-kit generate` never tries to manage Supabase's own schema. The trigger that creates
a `profiles` row when a new `auth.users` row is created is wired up in Phase 2
(Authentication), not here.

**Roles are a table, not an enum.** `roles` + `user_roles` (rather than a Postgres enum on
`profiles`) so new roles (`manager`, `inventory_manager`, `support`, `marketing`, ...) need a
data insert, not a schema migration — see MasterPlan.txt section 2.

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
(MasterPlan.txt section 8).

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

## Scope note: what Phase 1 does NOT include

- **COD/payment-method availability rules** (by country/city/zone/order value/product/
  customer history — MasterPlan.txt section 11) are not yet modeled as tables. They'll be
  added alongside the actual COD business logic in Phase 6 (Checkout), once there's real
  logic to attach them to.
- **Per-country address form requirements** ("address formats" in section 4) are treated as
  UI/validation config, not database rows — deferred to Phase 6.
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
