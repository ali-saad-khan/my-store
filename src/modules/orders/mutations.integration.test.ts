import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { inventory as inventoryTable, orderStatusHistory, payments } from "@/db/schema";
import { placeOrder } from "@/modules/checkout/mutations";
import type { DbTransaction } from "@/modules/inventory/mutations";
import { withRollback } from "../../../tests/helpers/db";
import {
  createTestCart,
  createTestProduct,
  getSeededCheckoutContext,
} from "../../../tests/helpers/fixtures";
import { InvalidStatusTransitionError, transitionOrderStatus } from "./mutations";

async function placeTestOrder(tx: DbTransaction) {
  const { product, inventory } = await createTestProduct(tx, {
    price: "500.00",
    quantityOnHand: 10,
  });
  const cart = await createTestCart(tx, [
    { productId: product.id, quantity: 2, unitPriceSnapshot: "500.00" },
  ]);
  const { address, shippingRateId } = await getSeededCheckoutContext(tx);

  const { order } = await placeOrder(
    {
      cartOwner: { sessionToken: cart.sessionToken! },
      profileId: null,
      email: "test@example.com",
      phone: "03000000000",
      address,
      shippingRateId,
    },
    tx,
  );

  return { order, inventory };
}

describe("transitionOrderStatus (integration, always rolled back)", () => {
  it("records a status-history row on every transition", async () => {
    await withRollback(async (tx) => {
      const { order } = await placeTestOrder(tx);

      await transitionOrderStatus({ orderId: order.id, toStatus: "confirmed", actorId: null }, tx);

      const history = await tx
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, order.id));
      // One row from placeOrder itself (pending), one from this transition.
      expect(history).toHaveLength(2);
      expect(history[1].fromStatus).toBe("pending");
      expect(history[1].toStatus).toBe("confirmed");
    });
  });

  it("rejects an invalid transition (e.g. pending straight to delivered)", async () => {
    await withRollback(async (tx) => {
      const { order } = await placeTestOrder(tx);

      await expect(
        transitionOrderStatus({ orderId: order.id, toStatus: "delivered", actorId: null }, tx),
      ).rejects.toThrow(InvalidStatusTransitionError);
    });
  });

  it("restocks inventory when an order is cancelled", async () => {
    await withRollback(async (tx) => {
      const { order, inventory } = await placeTestOrder(tx);

      const [afterOrder] = await tx
        .select()
        .from(inventoryTable)
        .where(eq(inventoryTable.id, inventory.id));
      expect(afterOrder.quantityOnHand).toBe(8); // 10 - 2, from placing the order

      await transitionOrderStatus({ orderId: order.id, toStatus: "cancelled", actorId: null }, tx);

      const [afterCancel] = await tx
        .select()
        .from(inventoryTable)
        .where(eq(inventoryTable.id, inventory.id));
      expect(afterCancel.quantityOnHand).toBe(10); // restocked back to the original 10
    });
  });

  it("settles the COD payment as paid when an order is marked delivered", async () => {
    await withRollback(async (tx) => {
      const { order } = await placeTestOrder(tx);

      await transitionOrderStatus({ orderId: order.id, toStatus: "confirmed", actorId: null }, tx);
      await transitionOrderStatus({ orderId: order.id, toStatus: "processing", actorId: null }, tx);
      await transitionOrderStatus({ orderId: order.id, toStatus: "packed", actorId: null }, tx);
      await transitionOrderStatus({ orderId: order.id, toStatus: "shipped", actorId: null }, tx);
      await transitionOrderStatus(
        { orderId: order.id, toStatus: "out_for_delivery", actorId: null },
        tx,
      );
      await transitionOrderStatus({ orderId: order.id, toStatus: "delivered", actorId: null }, tx);

      const [payment] = await tx.select().from(payments).where(eq(payments.orderId, order.id));
      expect(payment.status).toBe("paid");
    });
  });
});
