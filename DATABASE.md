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
A signed-in customer's order is still ownership-checked (`profileId` match, or admin). A
guest can also self-cancel via that same bearer link (`src/modules/orders/status.ts`'s
`CUSTOMER_CANCELLABLE_STATUSES` window); there's still no "look up my order by number +
email" search for a guest who lost the link.

**Order status is a state machine, not a free-form enum write.** `allowedNextStatuses`/
`canTransition` in `src/modules/orders/status.ts` define the only legal transitions
(pending → confirmed → processing → packed → shipped → out_for_delivery → delivered, with
cancel/return/refund branches — MasterPlan.txt section 12); `transitionOrderStatus`
(`src/modules/orders/mutations.ts`) rejects anything else. Side effects are attached to
specific transitions, all in the same transaction as the status write: cancelling or
returning an order restocks inventory via `adjustInventoryTx` (paired `cancellation`/
`return` movements — the sale movement from checkout is never edited, only offset);
delivering an order settles the COD payment from `pending` to `paid` with a `capture`
`payment_transactions` row; refunding sets it to `refunded`. Every transition — whether
admin- or customer-initiated — writes an `order_status_history` row.

**The admin product form can't change `hasVariants` after creation**, and that field is
submitted via a hidden input rather than the (visually disabled) checkbox on the edit page —
a disabled `<input>` is excluded from `FormData` entirely, so the checkbox's real value never
reaches the server. `updateProductAdmin` additionally never trusts the submitted
`hasVariants` at all; it re-reads the persisted value from `products` inside the transaction
and branches on that. Both were deliberate after live-testing caught the disabled-checkbox
case actually happening: an edit silently created a stray product-level `inventory` row
alongside a variant product's real variant-level rows. **Lesson for future admin forms with
a "locked after creation" field: either submit it via a hidden input, or (better, as done
here) have the mutation re-derive the true value from the DB instead of trusting the client
at all.**

**Admin product-form arrays are zipped by index across parallel `FormData` fields**
(`variantSku`, `variantPrice`, `variantAttr_<attributeId>`, ...), matching the pattern
already used for filter checkboxes elsewhere. This breaks if any per-row field is only
rendered for _some_ rows — live-testing caught exactly this: the "Initial stock" input only
existed for new (unsaved) variant rows, so submitting a mix of existing + new variants made
`variantInitialStock`'s array shorter than the others, shifting every value after the
mismatch to the wrong row. Fixed by always rendering one `variantInitialStock` field per row
(a hidden `value="0"` for existing rows, where it's ignored server-side anyway). **Any new
per-row field in this form must render unconditionally for every row, even where its value
is unused, or add an explicit per-row index instead of relying on array position.**

## Scope note: what Phase 8 (Admin) deliberately left out

MasterPlan.txt section 16 lists Coupons, Reviews, Shipping, Payments, Settings, and Audit
Logs as admin sections alongside Dashboard/Products/Categories/Inventory/Orders/Customers.
Per the user's explicit choice when this phase's scope was confirmed, only Dashboard +
Products + Categories + Customers were built now (Inventory and Orders already existed from
Phases 4 and 7):

- **Coupons and Reviews admin UI** are skipped entirely — those features don't exist yet
  (Phases 9 and 10), so an admin panel for them would have nothing real to manage.
- **Shipping-zone/rate CRUD** has no admin UI — `shipping_zones`/`shipping_rates` are still
  seed-data-only, same as Phase 6 left them.
- **A dedicated `/admin/payments` page** doesn't exist — payment status/transactions are
  visible per-order at `/admin/orders/[orderNumber]`, which covers what a first pass needs.
- **Settings and Audit Logs** are unbuilt. The `settings` and `audit_logs` tables exist from
  Phase 1 but nothing reads or writes them yet — no admin-initiated action (inventory
  adjustment, order status change, product edit, category delete, ...) currently produces an
  audit trail beyond each domain's own history table (`inventory_movements`,
  `order_status_history`). MasterPlan.txt section 17 asks for "audit logs for sensitive
  admin operations" — that's still open.

## Scope note: what Phase 1 does NOT include

- **COD/payment-method availability rules** (by country/city/zone/order value/product/
  customer history — MasterPlan.txt section 11) are still not modeled as tables. COD is the
  only active `payment_methods` row and checkout offers it unconditionally; per-zone/
  order-value/customer-history gating is real future work, not yet needed with a single
  payment method and a single active market.
- **Per-country address form requirements** ("address formats" in section 4) are treated as
  UI/validation config, not database rows. The checkout address form is Pakistan-shaped
  (city select, no address line 3, no state free-text — state is derived from the chosen
  city); a second active country would need its own form shape, not just new `cities` rows.
- Seed data only populates reference/config and catalog tables (currencies, countries,
  states, cities, tax rates, roles, payment methods, shipping zones/rates, categories,
  products, variants, inventory, coupons, settings). `profiles`, `addresses`, `carts`,
  `orders`, `reviews`, `wishlists`, and `notifications` all require a real Supabase Auth
  user and are seeded starting in Phase 2+.

## Scope note: Phase 9 (Coupons) design decisions

- **One active coupon per cart.** `carts.coupon_id` holds at most one applied coupon (added by
  migration `0003_married_havok.sql`). Stacking multiple coupons isn't supported — applying a
  new code replaces whatever was there.
- **Re-validated on every read, authoritatively re-checked at checkout.** `toCartView()`
  re-runs the full rules engine (`src/modules/coupons/discount.ts`'s `validateCoupon`) against
  the live cart every time the cart/checkout page renders — an expired coupon or one that hit
  its usage limit since being applied shows a `couponError` instead of a stale discount. The
  same function runs again *inside* `placeOrder()`'s transaction, right before the order is
  created, exactly like inventory/price re-validation (MasterPlan.txt section 8) — never
  trust a discount computed earlier in the request.
- **Discount is applied before tax.** `taxTotal = (subtotal - discountTotal) * taxRate`. This
  is a disclosed business-logic choice (tax-after-discount is the more common convention), not
  a MasterPlan requirement — revisit if the target market's tax rules require tax-on-gross.
  Order-item-level `discount_amount` is distributed proportionally across whichever line items
  are actually eligible for the coupon (respecting product/category restrictions), with any
  rounding remainder folded into the last eligible line so the parts always sum exactly to the
  order-level `discount_total`.
- **Per-customer usage limits aren't enforced for guest checkout.** `coupon_usages.profile_id`
  is null for a guest order, so `perCustomerLimit` can only be checked against a signed-in
  profile's history. A guest could in principle reuse a per-customer-limited code across
  multiple guest orders (no email-based tracking was added). Flagged here as a known gap, same
  as the COD-availability simplification from Phase 6.
- **Guest→profile cart merge (Phase 5) keeps whichever cart's coupon already applies:** if the
  signed-in profile's cart already has a coupon, the guest cart's is dropped; otherwise the
  guest cart's coupon carries over. No UI surfaces this edge case — it's rare enough (a coupon
  applied to a guest cart that's later merged into an account that *also* has its own coupon)
  not to warrant one yet.

## Scope note: Phase 10 (Reviews/Wishlist) design decisions

- **One active review per customer per product**, enforced by a partial unique index
  (`reviews_profile_product_unique` on `(profile_id, product_id) WHERE deleted_at IS NULL`,
  migration `0004_lucky_meltdown.sql`) — same partial-unique-index pattern `cart_items`
  already used for its per-cart uniqueness. Submitting a review when one already exists is an
  upsert (`ON CONFLICT ... DO UPDATE`): editing a review resets it to `pending` so moderation
  applies to the current content, not just the first submission. A customer's own delete is a
  soft delete (sets `deleted_at`), which frees the slot for a genuinely new review later
  rather than blocking it forever.
- **No purchase requirement to review.** Any signed-in customer can review any product —
  MasterPlan.txt doesn't require a verified purchase, and gating it would block early reviews
  on a low-traffic store. Instead, `findVerifyingOrderItem()` links the review to a matching
  *delivered* order item at write time (`reviews.order_item_id`, already in the Phase 1
  schema) purely for the "Verified purchase" badge — a cosmetic trust signal, not an access
  gate.
- **Wishlist is product-level only for this pass**, not per-variant, even though
  `wishlist_items.variant_id` exists (nullable, unused) in the Phase 1 schema. Nothing in the
  UI selects a variant ahead of the product detail page, so plumbing a selected variant into
  the wishlist toggle button would be premature; revisit if a customer-facing need for
  variant-specific wishlisting shows up.
- **Reviews are managed inline on the product page** (write/edit/delete right where you'd
  naturally do it), not through a separate `/account/reviews` list — mirrors how addresses
  are managed inline during checkout rather than through a dedicated `/account/addresses`
  page. Wishlist, by contrast, has no other natural home, so it gets its own
  `/account/wishlist` page.
- **No rating/review aggregates on product listing/category cards** — only the product detail
  page shows the average-rating summary. Adding it to `listProducts()` would mean an extra
  aggregated join on every catalog listing render; deferred until the catalog's size actually
  makes it worth the query cost. Review structured data (JSON-LD) for SEO is explicitly
  Phase 11, not this phase.

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
