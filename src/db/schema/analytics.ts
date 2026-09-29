import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { profiles } from "./identity";

/**
 * Append-only analytics event stream — MasterPlan.txt section 25. Self-hosted rather than
 * a third-party provider (no analytics vendor credentials exist for this project — see
 * DATABASE.md's Phase 13 scope note); `src/modules/analytics/track.ts` is the one place
 * that writes here, and the one place a future external provider would plug in alongside
 * or instead of this table.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventName: text("event_name").notNull(), // "product_viewed", "order_created", ...
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    properties: jsonb("properties").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("analytics_events_event_name_idx").on(table.eventName, table.createdAt)],
);
