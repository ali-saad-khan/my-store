import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { notificationChannelEnum, notificationStatusEnum } from "./enums";
import { profiles } from "./identity";

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull(),
  templateKey: text("template_key").notNull(), // "order_confirmation", "welcome", ...
  status: notificationStatusEnum("status").notNull().default("pending"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
