"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/session";
import { sendLowStockAlertEmail } from "@/modules/notifications/emails";
import { getSettingValue } from "@/modules/settings/queries";
import { adjustInventorySchema } from "@/validations/inventory";
import { getInventoryById } from "./queries";
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

  let updated;
  try {
    updated = await adjustInventory({
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

  const quantityAvailable = updated.quantityOnHand - updated.quantityReserved;
  if (quantityAvailable <= updated.reorderPoint) {
    const alertEmail = await getSettingValue<string>("support_email");
    if (alertEmail) {
      const withDetails = await getInventoryById(updated.id);
      if (withDetails) {
        const productName = withDetails.product?.name ?? withDetails.variant?.product.name ?? "Unknown product";
        const sku = withDetails.variant?.sku ?? withDetails.product?.sku ?? "—";
        const variantLabel = withDetails.variant
          ? withDetails.variant.attributeValues.map(({ attributeValue }) => attributeValue.value).join(" / ")
          : null;

        await sendLowStockAlertEmail({
          to: alertEmail,
          productName,
          variantLabel,
          sku,
          quantityAvailable,
          reorderPoint: updated.reorderPoint,
        });
      }
    }
  }

  revalidatePath("/admin/inventory");
  return { success: "Stock updated." };
}
