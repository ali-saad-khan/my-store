"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/session";
import { adjustInventorySchema } from "@/validations/inventory";
import { adjustInventory, InsufficientStockError, InventoryNotFoundError } from "./mutations";

export type AdjustInventoryActionState = { error?: string; success?: string } | undefined;

export async function adjustInventoryAction(
  _prevState: AdjustInventoryActionState,
  formData: FormData,
): Promise<AdjustInventoryActionState> {
  const admin = await requireAdmin();

  const parsed = adjustInventorySchema.safeParse({
    inventoryId: formData.get("inventoryId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? "Invalid input." };
  }

  try {
    await adjustInventory({
      inventoryId: parsed.data.inventoryId,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      note: parsed.data.note,
      actorId: admin.id,
    });
  } catch (error) {
    if (error instanceof InsufficientStockError || error instanceof InventoryNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/inventory");
  return { success: "Stock updated." };
}
