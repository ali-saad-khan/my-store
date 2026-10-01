import { pgEnum } from "drizzle-orm/pg-core";

export const productStatusEnum = pgEnum("product_status", ["draft", "active", "archived"]);

/** Admin-manageable homepage sections — src/db/schema/homepage.ts. */
export const homepageSectionKeyEnum = pgEnum("homepage_section_key", [
  "hero",
  "categories",
  "featured_products",
  "promo",
  "newsletter",
]);

export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", [
  "purchase",
  "sale",
  "return",
  "adjustment",
  "damage",
  "cancellation",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "cancelled",
]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "label_created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
]);

export const shippingRateTypeEnum = pgEnum("shipping_rate_type", [
  "flat",
  "free",
  "weight_based",
  "order_value_based",
]);

export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);

export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "whatsapp",
  "push",
]);

export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed"]);

export const addressTypeEnum = pgEnum("address_type", ["shipping", "billing"]);
