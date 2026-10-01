import { boolean, jsonb, pgTable, timestamp } from "drizzle-orm/pg-core";
import { homepageSectionKeyEnum } from "./enums";

/**
 * One row per homepage section (seeded once, never created/deleted by admins — see
 * src/db/seed/index.ts). `isVisible` lets admins hide a section without deleting its
 * content; `content` holds section-specific editable fields (headline/copy/image/link),
 * shaped per key by src/validations/homepage.ts — jsonb so adding a field to one section
 * never needs a migration.
 */
export const homepageSections = pgTable("homepage_sections", {
  key: homepageSectionKeyEnum("key").primaryKey(),
  isVisible: boolean("is_visible").notNull().default(true),
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
