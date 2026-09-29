import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { reviewStatusEnum } from "./enums";
import { profiles } from "./identity";
import { products } from "./catalog";
import { orderItems } from "./orders";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Links a review to the purchase that earned it a "verified purchase" badge.
    orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body"),
    status: reviewStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check("reviews_rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    // One active review per customer per product — soft-deleting one (deletedAt) frees the
    // slot for a new review rather than blocking it forever.
    uniqueIndex("reviews_profile_product_unique")
      .on(table.profileId, table.productId)
      .where(sql`${table.deletedAt} IS NULL`),
    // productId is the second column above, so a plain lookup by product (every
    // product page's review list/summary) needs its own index.
    index("reviews_product_id_idx").on(table.productId),
  ],
);
