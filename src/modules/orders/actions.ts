"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/session";
import { sendOrderStatusEmail } from "@/modules/notifications/emails";
import { cancelOrderSchema, updateOrderStatusSchema } from "@/validations/orders";
import { getOrderByNumberForViewer, getOrderForAdmin } from "./queries";
import {
  cancelOrderAsCustomer,
  InvalidStatusTransitionError,
  OrderNotCancellableError,
  OrderNotFoundError,
  transitionOrderStatus,
} from "./mutations";

export type OrderActionState = { error?: string; success?: string } | undefined;

export async function cancelOrderAction(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const parsed = cancelOrderSchema.safeParse({ orderNumber: formData.get("orderNumber") });
  if (!parsed.success) return { error: "Invalid request." };

  const order = await getOrderByNumberForViewer(parsed.data.orderNumber);
  if (!order) return { error: "Order not found." };

  try {
    await cancelOrderAsCustomer({
      orderId: order.id,
      currentStatus: order.status,
      actorId: order.profileId,
    });
  } catch (error) {
    if (error instanceof OrderNotCancellableError || error instanceof OrderNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  const recipientEmail = order.profile?.email ?? order.guestEmail;
  if (recipientEmail) {
    await sendOrderStatusEmail({
      to: recipientEmail,
      profileId: order.profileId,
      orderNumber: order.orderNumber,
      status: "cancelled",
    });
  }

  revalidatePath(`/orders/${parsed.data.orderNumber}`);
  revalidatePath("/account/orders");
  return { success: "Order cancelled." };
}

export async function updateOrderStatusAction(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const admin = await requireAdmin();

  const parsed = updateOrderStatusSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    toStatus: formData.get("toStatus"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? "Invalid input." };
  }

  const order = await getOrderForAdmin(parsed.data.orderNumber);
  if (!order) return { error: "Order not found." };

  try {
    await transitionOrderStatus({
      orderId: order.id,
      toStatus: parsed.data.toStatus,
      note: parsed.data.note,
      actorId: admin.id,
    });
  } catch (error) {
    if (error instanceof InvalidStatusTransitionError || error instanceof OrderNotFoundError) {
      return { error: error.message };
    }
    throw error;
  }

  const recipientEmail = order.profile?.email ?? order.guestEmail;
  if (recipientEmail) {
    await sendOrderStatusEmail({
      to: recipientEmail,
      profileId: order.profileId,
      orderNumber: order.orderNumber,
      status: parsed.data.toStatus,
      note: parsed.data.note,
    });
  }

  revalidatePath(`/admin/orders/${parsed.data.orderNumber}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${parsed.data.orderNumber}`);
  return { success: "Order updated." };
}
