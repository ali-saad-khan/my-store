import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { inventory as inventoryTable, orderItems, orders } from "@/db/schema";
import { withRollback } from "../../../tests/helpers/db";
import {
  createTestCart,
  createTestProduct,
  getSeededCheckoutContext,
} from "../../../tests/helpers/fixtures";
import { EmptyCartError, InsufficientStockForOrderError, placeOrder } from "./mutations";

describe("placeOrder (integration, always rolled back)", () => {
  it("creates an order + order item, decrements inventory, and clears the cart", async () => {
    await withRollback(async (tx) => {
      const { product, inventory } = await createTestProduct(tx, {
        price: "500.00",
        quantityOnHand: 10,
      });
      const cart = await createTestCart(tx, [
        { productId: product.id, quantity: 2, unitPriceSnapshot: "500.00" },
      ]);
      const { address, shippingRateId } = await getSeededCheckoutContext(tx);

      const { order, lines } = await placeOrder(
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

      expect(order.status).toBe("pending");
      expect(order.subtotal).toBe("1000.00"); // 500 * 2
      expect(lines).toHaveLength(1);

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
      expect(items[0].productNameSnapshot).toBe(product.name);

      const [updatedInventory] = await tx
        .select()
        .from(inventoryTable)
        .where(eq(inventoryTable.id, inventory.id));
      expect(updatedInventory.quantityOnHand).toBe(8); // 10 - 2

      // The cart's own row should be gone — placeOrder clears it on success.
      const remainingCart = await tx.query.carts.findFirst({
        where: (c, { eq: eqOp }) => eqOp(c.sessionToken, cart.sessionToken!),
      });
      expect(remainingCart).toBeUndefined();
    });
  });

  it("rejects when requested quantity exceeds available stock, with no order created", async () => {
    await withRollback(async (tx) => {
      const { product } = await createTestProduct(tx, { quantityOnHand: 1 });
      const cart = await createTestCart(tx, [
        { productId: product.id, quantity: 5, unitPriceSnapshot: "500.00" },
      ]);
      const { address, shippingRateId } = await getSeededCheckoutContext(tx);

      await expect(
        placeOrder(
          {
            cartOwner: { sessionToken: cart.sessionToken! },
            profileId: null,
            email: "test@example.com",
            phone: "03000000000",
            address,
            shippingRateId,
          },
          tx,
        ),
      ).rejects.toThrow(InsufficientStockForOrderError);

      const orderRows = await tx.select().from(orders).where(eq(orders.guestEmail, "test@example.com"));
      expect(orderRows).toHaveLength(0);
    });
  });

  it("rejects an empty cart", async () => {
    await withRollback(async (tx) => {
      const cart = await createTestCart(tx, []);
      const { address, shippingRateId } = await getSeededCheckoutContext(tx);

      await expect(
        placeOrder(
          {
            cartOwner: { sessionToken: cart.sessionToken! },
            profileId: null,
            email: "test@example.com",
            phone: "03000000000",
            address,
            shippingRateId,
          },
          tx,
        ),
      ).rejects.toThrow(EmptyCartError);
    });
  });
});
