import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { inventory, inventoryMovements, inventoryMovementTypeEnum } from "@/db/schema";

export type InventoryMovementType = (typeof inventoryMovementTypeEnum.enumValues)[number];

export class InventoryNotFoundError extends Error {
  constructor() {
    super("Inventory record not found.");
    this.name = "InventoryNotFoundError";
  }
}

export class InsufficientStockError extends Error {
  constructor() {
    super("This adjustment would take stock on hand below zero.");
    this.name = "InsufficientStockError";
  }
}

/**
 * Transaction-safe stock adjustment: locks the inventory row for the
 * duration of the transaction (`FOR UPDATE`) so concurrent adjustments
 * can't race past each other, rejects any change that would drive
 * `quantityOnHand` negative, and always writes a paired movement record —
 * `inventory.quantityOnHand` must never change without one.
 */
export async function adjustInventory(input: {
  inventoryId: string;
  type: InventoryMovementType;
  quantity: number;
  note?: string;
  referenceType?: string;
  referenceId?: string;
  actorId: string | null;
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(inventory)
      .where(eq(inventory.id, input.inventoryId))
      .for("update");

    if (!row) throw new InventoryNotFoundError();

    const nextQuantityOnHand = row.quantityOnHand + input.quantity;
    if (nextQuantityOnHand < 0) throw new InsufficientStockError();

    const [updated] = await tx
      .update(inventory)
      .set({ quantityOnHand: nextQuantityOnHand, updatedAt: new Date() })
      .where(eq(inventory.id, input.inventoryId))
      .returning();

    await tx.insert(inventoryMovements).values({
      inventoryId: input.inventoryId,
      type: input.type,
      quantity: input.quantity,
      note: input.note,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdBy: input.actorId,
    });

    return updated;
  });
}
