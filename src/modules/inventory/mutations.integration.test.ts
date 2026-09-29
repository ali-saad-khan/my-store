import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { inventory as inventoryTable, inventoryMovements } from "@/db/schema";
import { withRollback } from "../../../tests/helpers/db";
import { createTestProduct } from "../../../tests/helpers/fixtures";
import { adjustInventoryTx, InsufficientStockError } from "./mutations";

describe("adjustInventoryTx (integration, always rolled back)", () => {
  it("increases quantity on hand and records a movement row", async () => {
    await withRollback(async (tx) => {
      const { inventory } = await createTestProduct(tx, { quantityOnHand: 10 });

      const updated = await adjustInventoryTx(tx, {
        inventoryId: inventory.id,
        type: "purchase",
        quantity: 5,
        actorId: null,
      });

      expect(updated.quantityOnHand).toBe(15);

      const movements = await tx
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.inventoryId, inventory.id));
      expect(movements).toHaveLength(1);
      expect(movements[0].type).toBe("purchase");
      expect(movements[0].quantity).toBe(5);
    });
  });

  it("rejects an adjustment that would take stock below zero, with no partial write", async () => {
    await withRollback(async (tx) => {
      const { inventory } = await createTestProduct(tx, { quantityOnHand: 10 });

      await expect(
        adjustInventoryTx(tx, {
          inventoryId: inventory.id,
          type: "sale",
          quantity: -20,
          actorId: null,
        }),
      ).rejects.toThrow(InsufficientStockError);

      const [freshInventory] = await tx
        .select()
        .from(inventoryTable)
        .where(eq(inventoryTable.id, inventory.id));
      expect(freshInventory.quantityOnHand).toBe(10);

      const movements = await tx
        .select()
        .from(inventoryMovements)
        .where(eq(inventoryMovements.inventoryId, inventory.id));
      expect(movements).toHaveLength(0);
    });
  });
});
