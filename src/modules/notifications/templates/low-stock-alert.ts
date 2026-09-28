import { absoluteUrl } from "@/lib/seo";
import { escapeHtml, wrapEmailHtml } from "./layout";

export function buildLowStockAlertEmail(input: {
  productName: string;
  variantLabel: string | null;
  sku: string;
  quantityAvailable: number;
  reorderPoint: number;
}) {
  const name = input.variantLabel ? `${input.productName} (${input.variantLabel})` : input.productName;
  const subject = `Low stock: ${name}`;
  const inventoryUrl = absoluteUrl("/admin/inventory");

  const html = wrapEmailHtml(`
    <p style="margin:0 0 16px 0;"><strong>${escapeHtml(name)}</strong> is low on stock.</p>
    <p style="margin:0 0 16px 0;color:#666;">SKU ${escapeHtml(input.sku)} — ${input.quantityAvailable} available, reorder point ${input.reorderPoint}.</p>
    <p style="margin:0;"><a href="${inventoryUrl}" style="color:#111111;">Review inventory</a></p>
  `);

  const text = `Low stock: ${name}

SKU ${input.sku} — ${input.quantityAvailable} available, reorder point ${input.reorderPoint}.

Review inventory: ${inventoryUrl}`;

  return { subject, html, text };
}
