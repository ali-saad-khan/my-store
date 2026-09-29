import { round2 } from "@/lib/money";

/**
 * Order total math, isolated from DB access so it's directly unit-testable
 * (MasterPlan.txt section 28: unit tests for "order totals"). Tax is applied
 * to the post-discount amount — see DATABASE.md's Phase 9 scope note.
 */
export function computeOrderTotals(input: {
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  taxRate: number;
}) {
  const taxableAmount = round2(input.subtotal - input.discountTotal);
  const taxTotal = round2(taxableAmount * input.taxRate);
  const total = round2(taxableAmount + input.shippingCost + taxTotal);

  return { taxableAmount, taxTotal, total };
}
