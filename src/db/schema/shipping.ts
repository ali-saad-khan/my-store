import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { shipmentStatusEnum, shippingRateTypeEnum } from "./enums";
import { cities, countries, states } from "./reference";
import { orders } from "./orders";

export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Geographic coverage of a zone, at country, state, or city granularity
 * (only the most specific level set needs to match). Keeps cities/provinces
 * data-driven instead of hard-coded in application logic — section 13.
 */
export const shippingZoneLocations = pgTable("shipping_zone_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => shippingZones.id, { onDelete: "cascade" }),
  countryId: uuid("country_id")
    .notNull()
    .references(() => countries.id, { onDelete: "cascade" }),
  stateId: uuid("state_id").references(() => states.id, { onDelete: "cascade" }),
  cityId: uuid("city_id").references(() => cities.id, { onDelete: "cascade" }),
});

export const shippingRates = pgTable("shipping_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => shippingZones.id, { onDelete: "cascade" }),
  methodName: text("method_name").notNull(), // "Standard", "Express", ...
  rateType: shippingRateTypeEnum("rate_type").notNull(),
  baseRate: numeric("base_rate", { precision: 12, scale: 2 }).notNull().default("0"),
  minOrderValue: numeric("min_order_value", { precision: 12, scale: 2 }),
  freeShippingThreshold: numeric("free_shipping_threshold", { precision: 12, scale: 2 }),
  perKgRate: numeric("per_kg_rate", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  shippingRateId: uuid("shipping_rate_id").references(() => shippingRates.id, {
    onDelete: "set null",
  }),
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  status: shipmentStatusEnum("status").notNull().default("pending"),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipmentTracking = pgTable("shipment_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id")
    .notNull()
    .references(() => shipments.id, { onDelete: "cascade" }),
  status: shipmentStatusEnum("status").notNull(),
  location: text("location"),
  note: text("note"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
