import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Site-wide, admin-editable settings — key/value so new settings need no migration. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
