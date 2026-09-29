import { describe, expect, it } from "vitest";
import { computeOrderTotals } from "./totals";

describe("computeOrderTotals", () => {
  it("computes tax on the post-discount (taxable) amount, not the gross subtotal", () => {
    const result = computeOrderTotals({
      subtotal: 1000,
      discountTotal: 100,
      shippingCost: 50,
      taxRate: 0.1,
    });
    expect(result.taxableAmount).toBe(900);
    expect(result.taxTotal).toBe(90);
    expect(result.total).toBe(900 + 50 + 90);
  });

  it("with no discount and no tax, total is just subtotal plus shipping", () => {
    const result = computeOrderTotals({
      subtotal: 500,
      discountTotal: 0,
      shippingCost: 200,
      taxRate: 0,
    });
    expect(result.taxableAmount).toBe(500);
    expect(result.taxTotal).toBe(0);
    expect(result.total).toBe(700);
  });

  it("a discount that fully covers the subtotal never produces a negative taxable amount", () => {
    const result = computeOrderTotals({
      subtotal: 500,
      discountTotal: 500,
      shippingCost: 200,
      taxRate: 0.1,
    });
    expect(result.taxableAmount).toBe(0);
    expect(result.taxTotal).toBe(0);
    expect(result.total).toBe(200);
  });

  it("rounds cleanly for a tax rate that produces a repeating decimal", () => {
    const result = computeOrderTotals({
      subtotal: 100,
      discountTotal: 0,
      shippingCost: 0,
      taxRate: 1 / 3,
    });
    expect(result.taxTotal).toBe(33.33);
    expect(result.total).toBe(133.33);
  });
});
