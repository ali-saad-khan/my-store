import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  inventory,
  orderItems,
  orderStatusHistory,
  orders,
  paymentTransactions,
  payments,
} from "@/db/schema";
import { adjustInventoryTx, type DbTransaction } from "@/modules/inventory/mutations";
import { canTransition, CUSTOMER_CANCELLABLE_STATUSES, type OrderStatus } from "./status";

export class OrderNotFoundError extends Error {
  constructor() {
    super("Order not found.");
    this.name = "OrderNotFoundError";
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Can't move an order from "${from}" to "${to}".`);
    this.name = "InvalidStatusTransitionError";
  }
}

export class OrderNotCancellableError extends Error {
  constructor() {
    super("This order can no longer be cancelled — it's already being fulfilled.");
    this.name = "OrderNotCancellableError";
  }
}

/**
 * Applies an order status transition and its side effects in one
 * transaction: restocking inventory on cancel/return (reusing Phase 4's
 * transaction-safe `adjustInventoryTx`), settling the COD payment on
 * delivery/refund, and always writing a status-history row
 * (MasterPlan.txt section 12 — every transition is audited).
 */
export async function transitionOrderStatus(
  input: {
    orderId: string;
    toStatus: OrderStatus;
    note?: string;
    actorId: string | null;
  },
  client: DbTransaction | typeof db = db,
) {
  return client.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    if (!order) throw new OrderNotFoundError();
    if (!canTransition(order.status, input.toStatus)) {
      throw new InvalidStatusTransitionError(order.status, input.toStatus);
    }

    if (input.toStatus === "cancelled" || input.toStatus === "returned") {
      await restockOrderItems(
        tx,
        order.id,
        input.toStatus === "cancelled" ? "cancellation" : "return",
        input.actorId,
      );
    }

    const [payment] = await tx.select().from(payments).where(eq(payments.orderId, order.id));
    if (payment) {
      await settlePayment(tx, payment, input.toStatus);
    }

    const [updated] = await tx
      .update(orders)
      .set({ status: input.toStatus, updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: input.toStatus,
      note: input.note,
      changedBy: input.actorId,
    });

    return updated;
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function restockOrderItems(
  tx: Tx,
  orderId: string,
  type: "cancellation" | "return",
  actorId: string | null,
) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    const inventoryRow = item.variantId
      ? await tx.query.inventory.findFirst({ where: eq(inventory.variantId, item.variantId) })
      : item.productId
        ? await tx.query.inventory.findFirst({ where: eq(inventory.productId, item.productId) })
        : null;
    if (!inventoryRow) continue;

    await adjustInventoryTx(tx, {
      inventoryId: inventoryRow.id,
      type,
      quantity: item.quantity,
      referenceType: "order",
      referenceId: orderId,
      actorId,
    });
  }
}

/** COD settles on delivery (cash collected), reverses on cancel, and closes out on refund. */
async function settlePayment(tx: Tx, payment: typeof payments.$inferSelect, toStatus: OrderStatus) {
  const settlement: Record<
    string,
    { status: (typeof payments.$inferSelect)["status"]; type: string } | undefined
  > = {
    cancelled: payment.status === "pending" ? { status: "cancelled", type: "cancel" } : undefined,
    delivered: payment.status === "pending" ? { status: "paid", type: "capture" } : undefined,
    refunded: { status: "refunded", type: "refund" },
  };

  const next = settlement[toStatus];
  if (!next) return;

  await tx
    .update(payments)
    .set({ status: next.status, updatedAt: new Date() })
    .where(eq(payments.id, payment.id));

  await tx.insert(paymentTransactions).values({
    paymentId: payment.id,
    provider: "cod",
    type: next.type,
    status: next.status,
    amount: payment.amount,
  });
}

/** Self-service cancellation — a tighter window than what admins can do (`transitionOrderStatus` directly). */
export async function cancelOrderAsCustomer(
  input: {
    orderId: string;
    currentStatus: OrderStatus;
    actorId: string | null;
  },
  client: DbTransaction | typeof db = db,
) {
  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(input.currentStatus)) {
    throw new OrderNotCancellableError();
  }

  return transitionOrderStatus(
    {
      orderId: input.orderId,
      toStatus: "cancelled",
      note: "Cancelled by customer.",
      actorId: input.actorId,
    },
    client,
  );
}
