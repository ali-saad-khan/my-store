import "server-only";
import type { OrderStatus } from "@/modules/orders/status";
import { sendTransactionalEmail } from "./email-service";
import { buildLowStockAlertEmail } from "./templates/low-stock-alert";
import { buildOrderConfirmationEmail } from "./templates/order-confirmation";
import { buildOrderStatusUpdateEmail } from "./templates/order-status-update";

export async function sendOrderConfirmationEmail(input: {
  to: string;
  profileId: string | null;
  orderNumber: string;
  lines: { productName: string; variantLabel: string | null; quantity: number; price: string }[];
  address: {
    recipientName: string;
    line1: string;
    line2?: string;
    cityName: string;
    stateName?: string;
    countryName: string;
    postalCode?: string;
  };
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  total: string;
}) {
  const { subject, html, text } = buildOrderConfirmationEmail(input);
  await sendTransactionalEmail({
    to: input.to,
    profileId: input.profileId,
    templateKey: "order_confirmation",
    subject,
    html,
    text,
    payload: { orderNumber: input.orderNumber },
  });
}

export async function sendOrderStatusEmail(input: {
  to: string;
  profileId: string | null;
  orderNumber: string;
  status: OrderStatus;
  note?: string | null;
}) {
  const { subject, html, text } = buildOrderStatusUpdateEmail(input);
  await sendTransactionalEmail({
    to: input.to,
    profileId: input.profileId,
    templateKey: `order_status_${input.status}`,
    subject,
    html,
    text,
    payload: { orderNumber: input.orderNumber, status: input.status },
  });
}

export async function sendLowStockAlertEmail(input: {
  to: string;
  productName: string;
  variantLabel: string | null;
  sku: string;
  quantityAvailable: number;
  reorderPoint: number;
}) {
  const { subject, html, text } = buildLowStockAlertEmail(input);
  await sendTransactionalEmail({
    to: input.to,
    profileId: null,
    templateKey: "low_stock_alert",
    subject,
    html,
    text,
    payload: { sku: input.sku, quantityAvailable: input.quantityAvailable },
  });
}
