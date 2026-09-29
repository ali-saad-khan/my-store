import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Admin-managed hero slider slides shown at the top of the homepage. */
export const banners = pgTable(
  "banners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    imageUrl: text("image_url").notNull(),
    title: text("title"),
    subtitle: text("subtitle"),
    ctaLabel: text("cta_label"),
    ctaLink: text("cta_link"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("banners_is_active_sort_order_idx").on(table.isActive, table.sortOrder)],
);
