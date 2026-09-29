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
import { inventoryMovementTypeEnum } from "./enums";
import { profiles } from "./identity";
import { productVariants, products } from "./catalog";

/**
 * One inventory row per sellable unit: either a variant-less product OR a
 * single variant, never both, never neither.
 */
export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    quantityOnHand: integer("quantity_on_hand").notNull().default(0),
    quantityReserved: integer("quantity_reserved").notNull().default(0),
    reorderPoint: integer("reorder_point").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inventory_product_id_unique")
      .on(table.productId)
      .where(sql`${table.variantId} IS NULL`),
    uniqueIndex("inventory_variant_id_unique")
      .on(table.variantId)
      .where(sql`${table.variantId} IS NOT NULL`),
    check(
      "inventory_exactly_one_target",
      sql`(${table.productId} IS NOT NULL) <> (${table.variantId} IS NOT NULL)`,
    ),
    check("inventory_non_negative_on_hand", sql`${table.quantityOnHand} >= 0`),
    check("inventory_non_negative_reserved", sql`${table.quantityReserved} >= 0`),
  ],
);

/** Append-only ledger — never decrement `inventory.quantity_on_hand` without a row here. */
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inventoryId: uuid("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "cascade" }),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(), // signed: positive increases stock, negative decreases
    referenceType: text("reference_type"), // e.g. "order"
    referenceId: uuid("reference_id"),
    note: text("note"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("inventory_movements_inventory_id_idx").on(table.inventoryId)],
);
