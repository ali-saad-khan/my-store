import { formatPrice } from "@/lib/currency";
import { escapeHtml, wrapEmailHtml } from "./layout";

type OrderLine = {
  productName: string;
  variantLabel: string | null;
  quantity: number;
  price: string;
};

type OrderAddress = {
  recipientName: string;
  line1: string;
  line2?: string;
  cityName: string;
  stateName?: string;
  countryName: string;
  postalCode?: string;
};

export function buildOrderConfirmationEmail(input: {
  orderNumber: string;
  lines: OrderLine[];
  address: OrderAddress;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  total: string;
}) {
  const subject = `Order confirmed — ${input.orderNumber}`;

  const itemsHtml = input.lines
    .map(
      (line) => `<tr>
        <td style="padding:4px 0;">${escapeHtml(line.productName)}${line.variantLabel ? ` <span style="color:#666;">(${escapeHtml(line.variantLabel)})</span>` : ""}<br/><span style="color:#666;">Qty ${line.quantity} × ${formatPrice(line.price)}</span></td>
        <td style="padding:4px 0;text-align:right;">${formatPrice(Number(line.price) * line.quantity)}</td>
      </tr>`,
    )
    .join("");

  const itemsText = input.lines
    .map(
      (line) =>
        `- ${line.productName}${line.variantLabel ? ` (${line.variantLabel})` : ""}: ${line.quantity} x ${formatPrice(line.price)}`,
    )
    .join("\n");

  const html = wrapEmailHtml(`
    <p style="margin:0 0 16px 0;">Thanks for your order! We'll email you again once it ships.</p>
    <p style="margin:0 0 16px 0;"><strong>Order ${escapeHtml(input.orderNumber)}</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;margin-bottom:16px;">
      ${itemsHtml}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="color:#666;">Subtotal</td><td style="text-align:right;">${formatPrice(input.subtotal)}</td></tr>
      ${Number(input.discountTotal) > 0 ? `<tr><td style="color:#666;">Discount</td><td style="text-align:right;">-${formatPrice(input.discountTotal)}</td></tr>` : ""}
      <tr><td style="color:#666;">Shipping</td><td style="text-align:right;">${formatPrice(input.shippingTotal)}</td></tr>
      ${Number(input.taxTotal) > 0 ? `<tr><td style="color:#666;">Tax</td><td style="text-align:right;">${formatPrice(input.taxTotal)}</td></tr>` : ""}
      <tr><td style="font-weight:700;padding-top:8px;">Total</td><td style="text-align:right;font-weight:700;padding-top:8px;">${formatPrice(input.total)}</td></tr>
    </table>
    <p style="margin:16px 0 4px 0;color:#666;">Delivery address</p>
    <p style="margin:0;">
      ${escapeHtml(input.address.recipientName)}<br/>
      ${escapeHtml(input.address.line1)}${input.address.line2 ? `, ${escapeHtml(input.address.line2)}` : ""}<br/>
      ${escapeHtml(input.address.cityName)}${input.address.stateName ? `, ${escapeHtml(input.address.stateName)}` : ""}, ${escapeHtml(input.address.countryName)}${input.address.postalCode ? ` ${escapeHtml(input.address.postalCode)}` : ""}
    </p>
    <p style="margin:16px 0 0 0;">Payment method: Cash on Delivery — ${formatPrice(input.total)} due on delivery.</p>
  `);

  const text = `Order confirmed — ${input.orderNumber}

${itemsText}

Subtotal: ${formatPrice(input.subtotal)}
${Number(input.discountTotal) > 0 ? `Discount: -${formatPrice(input.discountTotal)}\n` : ""}Shipping: ${formatPrice(input.shippingTotal)}
${Number(input.taxTotal) > 0 ? `Tax: ${formatPrice(input.taxTotal)}\n` : ""}Total: ${formatPrice(input.total)}

Delivery address:
${input.address.recipientName}
${input.address.line1}${input.address.line2 ? `, ${input.address.line2}` : ""}
${input.address.cityName}${input.address.stateName ? `, ${input.address.stateName}` : ""}, ${input.address.countryName}${input.address.postalCode ? ` ${input.address.postalCode}` : ""}

Payment method: Cash on Delivery — ${formatPrice(input.total)} due on delivery.`;

  return { subject, html, text };
}
