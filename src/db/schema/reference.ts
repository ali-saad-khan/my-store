import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Reference/configuration data. Business logic must read market rules (currency,
 * tax, shipping geography) from these tables instead of hard-coding
 * country/currency assumptions — see src/config/market.ts and MasterPlan.txt section 4.
 */

export const currencies = pgTable("currencies", {
  code: text("code").primaryKey(), // ISO 4217, e.g. "PKR"
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  decimalDigits: integer("decimal_digits").notNull().default(2),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const countries = pgTable("countries", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // ISO 3166-1 alpha-2, e.g. "PK"
  name: text("name").notNull(),
  currencyCode: text("currency_code")
    .notNull()
    .references(() => currencies.code),
  phoneCode: text("phone_code"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const states = pgTable("states", {
  id: uuid("id").primaryKey().defaultRandom(),
  countryId: uuid("country_id")
    .notNull()
    .references(() => countries.id, { onDelete: "cascade" }),
  code: text("code"),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cities = pgTable("cities", {
  id: uuid("id").primaryKey().defaultRandom(),
  countryId: uuid("country_id")
    .notNull()
    .references(() => countries.id, { onDelete: "cascade" }),
  stateId: uuid("state_id").references(() => states.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Minimal country/state tax rule. Extended with product/category-level rules
 * when checkout tax calculation is implemented (Phase 6).
 */
export const taxRates = pgTable("tax_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  countryId: uuid("country_id")
    .notNull()
    .references(() => countries.id, { onDelete: "cascade" }),
  stateId: uuid("state_id").references(() => states.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rate: numeric("rate", { precision: 6, scale: 4 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
