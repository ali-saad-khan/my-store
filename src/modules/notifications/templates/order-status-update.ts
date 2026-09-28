import { absoluteUrl } from "@/lib/seo";
import type { OrderStatus } from "@/modules/orders/status";
import { ORDER_STATUS_LABELS } from "@/modules/orders/status";
import { escapeHtml, wrapEmailHtml } from "./layout";

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  confirmed: "We've confirmed your order and are getting it ready.",
  processing: "Your order is being processed.",
  packed: "Your order has been packed and is ready for pickup by the courier.",
  shipped: "Your order is on its way.",
  out_for_delivery: "Your order is out for delivery — it should arrive today.",
  delivered:
    "Your order has been delivered. Since this was Cash on Delivery, we've marked the payment as received — thank you!",
  cancelled: "Your order has been cancelled.",
  returned: "Your order has been marked as returned.",
  refunded: "Your order has been refunded.",
};

export function buildOrderStatusUpdateEmail(input: {
  orderNumber: string;
  status: OrderStatus;
  note?: string | null;
}) {
  const statusLabel = ORDER_STATUS_LABELS[input.status];
  const message = STATUS_MESSAGES[input.status] ?? `Your order status is now: ${statusLabel}.`;
  const orderUrl = absoluteUrl(`/orders/${input.orderNumber}`);
  const subject = `Order ${input.orderNumber}: ${statusLabel}`;

  const html = wrapEmailHtml(`
    <p style="margin:0 0 16px 0;"><strong>Order ${escapeHtml(input.orderNumber)}</strong> — ${escapeHtml(statusLabel)}</p>
    <p style="margin:0 0 16px 0;">${escapeHtml(message)}</p>
    ${input.note ? `<p style="margin:0 0 16px 0;color:#666;">Note: ${escapeHtml(input.note)}</p>` : ""}
    <p style="margin:0;"><a href="${orderUrl}" style="color:#111111;">View your order</a></p>
  `);

  const text = `Order ${input.orderNumber}: ${statusLabel}

${message}
${input.note ? `\nNote: ${input.note}\n` : ""}
View your order: ${orderUrl}`;

  return { subject, html, text };
}
