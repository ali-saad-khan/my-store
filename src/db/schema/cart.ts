import { sql } from "drizzle-orm";
import {
  check,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { profiles } from "./identity";
import { productVariants, products } from "./catalog";

/** A cart belongs to a signed-in profile OR is identified by a guest session token. */
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").unique(),
    currencyCode: text("currency_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "carts_owner_or_session",
      sql`(${table.profileId} IS NOT NULL) OR (${table.sessionToken} IS NOT NULL)`,
    ),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    // Display-only snapshot of price at add-time; checkout always re-validates against
    // live price/availability server-side (MasterPlan.txt section 8) before an order is created.
    unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("cart_items_quantity_positive", sql`${table.quantity} > 0`),
    // One row per (cart, sellable unit) — mirrors `inventory`'s partial unique
    // indexes. Lets `addToCart` use a single atomic upsert instead of a
    // check-then-write that would race under concurrent requests.
    uniqueIndex("cart_items_cart_product_unique")
      .on(table.cartId, table.productId)
      .where(sql`${table.variantId} IS NULL`),
    uniqueIndex("cart_items_cart_variant_unique")
      .on(table.cartId, table.variantId)
      .where(sql`${table.variantId} IS NOT NULL`),
  ],
);
