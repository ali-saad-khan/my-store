import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * `profiles.id` is the same UUID as the corresponding `auth.users.id` row that
 * Supabase Auth manages. We do not model `auth.users` in Drizzle (Supabase owns
 * that schema); the foreign key to it is added via raw SQL in the initial
 * migration, and the row-creation trigger is wired up in Phase 2 (Authentication).
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  locale: text("locale").notNull().default("en-PK"),
  timezone: text("timezone").notNull().default("Asia/Karachi"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/** Roles are a table, not an enum, so new roles (manager, support, ...) need no migration. */
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // "customer", "admin", ...
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.roleId] })],
);
