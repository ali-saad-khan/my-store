import { sql } from "drizzle-orm";
import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./identity";
import { productVariants, products } from "./catalog";

export const wishlists = pgTable("wishlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wishlistId: uuid("wishlist_id")
      .notNull()
      .references(() => wishlists.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Same partial-unique-index pattern as cart_items: one row per (wishlist, sellable
    // unit), letting add-to-wishlist use an atomic upsert instead of check-then-write.
    uniqueIndex("wishlist_items_wishlist_product_unique")
      .on(table.wishlistId, table.productId)
      .where(sql`${table.variantId} IS NULL`),
    uniqueIndex("wishlist_items_wishlist_variant_unique")
      .on(table.wishlistId, table.variantId)
      .where(sql`${table.variantId} IS NOT NULL`),
  ],
);
