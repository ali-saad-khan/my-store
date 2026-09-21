import { integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { addressTypeEnum, orderStatusEnum } from "./enums";
import { profiles } from "./identity";
import { productVariants, products } from "./catalog";
import { paymentMethods } from "./payment-methods";
import { coupons } from "./coupons";
import { addresses } from "./addresses";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  status: orderStatusEnum("status").notNull().default("pending"),
  currencyCode: text("currency_code").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountTotal: numeric("discount_total", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingTotal: numeric("shipping_total", { precision: 12, scale: 2 }).notNull().default("0"),
  taxTotal: numeric("tax_total", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
  paymentMethodId: uuid("payment_method_id")
    .notNull()
    .references(() => paymentMethods.id, { onDelete: "restrict" }),
  notes: text("notes"),
  placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Line-item snapshot. Preserves what the customer actually bought at purchase
 * time, independent of later changes to the product — MasterPlan.txt section 12.
 */
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot").notNull(),
  variantLabelSnapshot: text("variant_label_snapshot"), // e.g. "Small / Black"
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Address snapshot used for the order, independent of the customer's live address book. */
export const orderAddresses = pgTable("order_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  sourceAddressId: uuid("source_address_id").references(() => addresses.id, {
    onDelete: "set null",
  }),
  type: addressTypeEnum("type").notNull(),
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  cityName: text("city_name").notNull(),
  stateName: text("state_name"),
  countryName: text("country_name").notNull(),
  postalCode: text("postal_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  note: text("note"),
  changedBy: uuid("changed_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const couponUsages = pgTable(
  "coupon_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("coupon_usages_coupon_order_unique").on(table.couponId, table.orderId)],
);
