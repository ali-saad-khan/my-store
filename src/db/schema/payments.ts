import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { paymentStatusEnum } from "./enums";
import { orders } from "./orders";
import { paymentMethods } from "./payment-methods";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    paymentMethodId: uuid("payment_method_id")
      .notNull()
      .references(() => paymentMethods.id, { onDelete: "restrict" }),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currencyCode: text("currency_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payments_order_id_idx").on(table.orderId)],
);

/** Raw provider interaction log (authorize/capture/refund/...) for one payment. */
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // "cod", "manual_gateway", "stripe", ...
    providerTransactionId: text("provider_transaction_id"),
    type: text("type").notNull(), // "authorize" | "capture" | "refund" | ...
    status: text("status").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    rawResponse: jsonb("raw_response").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payment_transactions_payment_id_idx").on(table.paymentId)],
);

/**
 * Incoming webhook log. Idempotency is enforced via the (provider, provider_event_id)
 * unique index so retried deliveries never double-process — MasterPlan.txt section 10.
 */
export const paymentWebhooks = pgTable(
  "payment_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id"),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    signatureVerified: boolean("signature_verified").notNull().default(false),
    processed: boolean("processed").notNull().default(false),
    error: text("error"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("payment_webhooks_provider_event_unique")
      .on(table.provider, table.providerEventId)
      .where(sql`${table.providerEventId} IS NOT NULL`),
  ],
);
