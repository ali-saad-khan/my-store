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

## Scope note: Phase 11 (SEO) design decisions

- **`openGraph`/`twitter` are NOT deep-merged across layout and page** — confirmed live: the
  product page's own `openGraph` (title/description/url/images only) silently dropped
  `og:site_name`/`og:type`/`og:locale` from the root layout's defaults, because Next replaces
  the whole nested object per segment rather than merging it field-by-field. Fixed with
  `buildOpenGraph()` in `src/lib/seo.ts`, which every page's `openGraph` is built through so
  the site-wide defaults can never silently go missing again. **Any future page that sets its
  own `openGraph` must go through `buildOpenGraph()`, not a bare object literal.**
- **JSON-LD is escaped defensively.** `src/components/json-ld.tsx` replaces `<` with
  `<` before injecting into `dangerouslySetInnerHTML`, so admin-entered content (a
  product description containing literal `</script>`) can't break out of the script tag.
  Product/category names and descriptions come from trusted admin input, not raw customer
  input, but this costs nothing and removes the question entirely.
- **Sitemap is revalidated hourly, not build-time-only.** `src/app/sitemap.ts` queries the
  live `products`/`categories` tables directly; without `export const revalidate = 3600` it
  would statically bake in whatever the catalog looked like at the last deploy and silently
  go stale as admins add/edit products between deploys (this store has no scheduled
  rebuilds).
- **Private routes are excluded two ways, not one:** `robots.txt` (`Disallow`) stops
  well-behaved crawlers from ever requesting `/admin`, `/account`, `/checkout`, `/cart`,
  `/orders/*`, and the auth pages, and a `<meta name="robots" content="noindex,nofollow">`
  tag (set once on `admin/layout.tsx` and a new `account/layout.tsx`, inherited by every page
  under them without each page repeating it — verified live that the merge actually
  propagates) covers any crawler that ignores `robots.txt` or a page that gets linked
  externally despite the disallow. `/login`, `/register`, etc. rely on `robots.txt` alone
  (low duplicate-content risk, not worth six more one-line edits).
- **Category breadcrumbs are one level deep** (Home → Category), matching the current flat
  seed data (no category is nested under another yet) and `getCategoryBySlug()`'s existing
  shape, which doesn't return a parent chain. Product breadcrumbs use the product's first
  linked category, same simplification `getProductBySlug()` already made in Phase 3. A
  multi-level parent chain is real future work if categories actually get nested.
- **Product structured data uses `AggregateOffer` (price range) for variant products** and a
  single `Offer` for simple products — `priceCurrency` always comes from
  `DEFAULT_MARKET.currencyCode` (Phase 0's single-market rule), never hard-coded `"PKR"`.
  `availability` is computed from live inventory the same way the storefront's own
  in-stock/out-of-stock label is, so the two can't disagree.

## Scope note: Phase 12 (Email) design decisions

- **No real Resend account exists for this project.** Per MasterPlan.txt section 35 (never
  invent credentials, never pretend an unconfigured integration is complete), `.env.local`
  has `RESEND_API_KEY`/`RESEND_FROM_EMAIL` present but blank. `src/modules/notifications/
  email-service.ts`'s `getEmailProvider()` picks the real `ResendProvider` when both are set
  and a console-logging `ConsoleProvider` otherwise — verified live: placing an order,
  transitioning it through every status, and triggering a low-stock alert all correctly
  logged `[email:dev-mock] NOT actually sent (no RESEND_API_KEY configured)` with the right
  recipient/subject/body, and each attempt still wrote a row to `notifications` with
  `status: "sent"` (the abstraction's job — handing off to a provider — succeeded; whether
  that provider is real is a separate, disclosed fact). **Never wire a second/alternate email
  path that bypasses `sendTransactionalEmail()` — that function is the only place a
  `notifications` audit row gets written.**
- **Email sending never throws back into the business flow that triggered it.**
  `sendTransactionalEmail()` catches every provider error internally, records
  `status: "failed"` + the error message on the `notifications` row, and returns normally —
  by the time an order is placed or a status transitions, that database change has already
  committed, so a flaky email provider must never roll back or block a business event that
  already succeeded. Callers (`checkout/actions.ts`, `orders/actions.ts`,
  `inventory/actions.ts`) call it without a surrounding try/catch on purpose.
- **"Welcome", "Email verification", and "Password reset" from MasterPlan.txt section 23's
  list are intentionally not built here** — Supabase Auth already sends its own signup/
  verification/password-reset emails as part of the auth flow wired in Phase 2. Duplicating
  them through Resend would mean two competing email systems for the same events. "Payment
  confirmation" is folded into the generic order-status email's `delivered` case (COD
  payment settles on delivery, per Phase 7) rather than being a separate template.
- **Low-stock alerts fire only from the admin manual-adjustment flow**
  (`inventory/actions.ts`), not from every checkout-triggered sale decrement. Firing one per
  unit sold on a popular near-empty product would spam the configured `support_email`
  recipient on every single order; a periodic or threshold-crossing-only sweep is more
  correct future work; checked-by-hand adjustments are a natural, low-frequency moment to
  alert instead.
- **The order-confirmation email reads `lines` returned directly from `placeOrder()`'s
  transaction** (already computed there — product name, variant label, price, quantity)
  rather than re-fetching the order afterward, avoiding an extra round trip on the checkout
  hot path. The recipient is always the `email` field submitted on the checkout form (used
  for both guest and signed-in checkouts already), not `profiles.email`, since that's the
  address the customer actually confirmed at checkout time.

## Scope note: Phase 13 (Analytics) design decisions

- **Self-hosted event store, no third-party analytics vendor** (no PostHog/Segment/GA4
  credentials exist for this project — same reasoning as Phase 12's email provider). A new
  `analytics_events` table (migration `0005_graceful_bloodaxe.sql`: `event_name`, nullable
  `profile_id`, `properties` jsonb, indexed on `(event_name, created_at)`) is the only sink
  today. `src/modules/analytics/track.ts`'s `track()` is the one place any event gets
  written, behind an `AnalyticsProvider` interface — a future PostHog/Segment/GA4 provider
  would plug in there the same way Resend plugs in behind email's `EmailProvider`, but isn't
  written until there's a real account to test it against (MasterPlan.txt section 35).
- **No anonymous visitor/session ID.** Events are attributed to a `profile_id` when
  signed in and otherwise fully anonymous — no new tracking cookie was introduced to
  correlate a guest's events across a session. Contextual identifiers (product ID, search
  query, order ID) live in each event's `properties` instead. Revisit if guest funnel
  analysis (e.g. anonymous cart abandonment) becomes a real need.
- **`track()` calls live in the page/action layer, never inside `mutations.ts` files** —
  MasterPlan.txt section 25's "do not place analytics code throughout business logic
  unnecessarily," applied literally: `product_viewed` is in the product page component,
  `order_created`/`payment_started` are in `checkout/actions.ts`, `order_completed` is in
  `orders/actions.ts` (fires on the `delivered` transition specifically, not on every
  transition), never inside `checkout/mutations.ts`'s `placeOrder()` transaction itself.
- **`track()` never throws**, identically to `sendTransactionalEmail()` — a dropped
  analytics event must never break checkout, cart, wishlist, or any other business flow.
- **Known, disclosed imprecision: `product_viewed` can double-count within one page visit.**
  It's tracked on every Server Component render of the product page, and a Server Action
  called from that page (e.g. "Add to cart") triggers `revalidatePath("/", "layout")`, which
  re-renders the current route including the product page itself — logging a second
  `product_viewed` for what a user would call one visit. Confirmed live: viewing then adding
  to cart from the same product page produced two `product_viewed` rows a fraction of a
  second apart. Not fixed in this phase (would need client-side dedup/a beacon-based
  approach); the "Most viewed products" admin view is a relative ranking signal, not an exact
  visit count — good enough for this pass, called out here so it isn't mistaken for a bug
  later.
- **The "Most viewed products" admin query extracts `properties->>'productId'` from the
  jsonb column directly in SQL** (grouped/ordered there, then joined back to `products` by
  ID for a display name) rather than normalizing product-related events into their own
  typed columns — the event table is intentionally schema-light (MasterPlan.txt section 5:
  don't over-normalize without a clear reason) since analytics properties vary per event
  type by design.

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
