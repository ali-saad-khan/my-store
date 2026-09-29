import { round2 } from "@/lib/money";

/**
 * Pure discount math, isolated from DB access (coupon lookup, usage-limit checks) so it's
 * directly unit-testable — MasterPlan.txt section 28's "unit tests for ... coupon rules."
 */
export function calculateCouponDiscount(input: {
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount: number | null;
  eligibleSubtotal: number;
}): number {
  let discountAmount =
    input.discountType === "percentage"
      ? input.eligibleSubtotal * (input.discountValue / 100)
      : input.discountValue;

  discountAmount = Math.min(discountAmount, input.eligibleSubtotal);
  if (input.maxDiscountAmount !== null) {
    discountAmount = Math.min(discountAmount, input.maxDiscountAmount);
  }

  return round2(discountAmount);
}

export type DiscountLine = { key: string; lineSubtotal: number };

/**
 * Splits a total discount proportionally across eligible lines by their share of the
 * eligible subtotal, folding any rounding remainder into the last line so the parts always
 * sum exactly to `discountAmount`.
 */
export function distributeDiscount(
  discountAmount: number,
  eligibleLines: DiscountLine[],
): Map<string, number> {
  const perLineDiscount = new Map<string, number>();
  const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  if (discountAmount <= 0 || eligibleSubtotal <= 0) return perLineDiscount;

  let allocated = 0;
  eligibleLines.forEach((line, index) => {
    const isLast = index === eligibleLines.length - 1;
    const amount = isLast
      ? round2(discountAmount - allocated)
      : round2(discountAmount * (line.lineSubtotal / eligibleSubtotal));
    allocated = round2(allocated + amount);
    perLineDiscount.set(line.key, amount);
  });

  return perLineDiscount;
}
