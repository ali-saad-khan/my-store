import type { orderStatusEnum } from "@/db/schema";

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

/** The order lifecycle state machine — MasterPlan.txt section 12. */
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "returned"],
  out_for_delivery: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: ["refunded"],
  refunded: [],
};

export function allowedNextStatuses(current: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[current];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** Statuses a customer can still cancel from themselves, before fulfillment has really started. */
export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = ["pending", "confirmed"];
