import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Data-driven payment methods (COD, a placeholder gateway now; Stripe/PayPal/regional
 * providers later) so the order system never depends on a specific provider —
 * MasterPlan.txt section 10.
 */
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // "cod", "manual_gateway", ...
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config").$type<Record<string, unknown>>(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
