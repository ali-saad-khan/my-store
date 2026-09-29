import { describe, expect, it } from "vitest";
import { calculateCouponDiscount, distributeDiscount } from "./discount-math";

describe("calculateCouponDiscount", () => {
  it("percentage: computes a straightforward percentage of the eligible subtotal", () => {
    const amount = calculateCouponDiscount({
      discountType: "percentage",
      discountValue: 10,
      maxDiscountAmount: null,
      eligibleSubtotal: 1000,
    });
    expect(amount).toBe(100);
  });

  it("percentage: caps at the max discount amount when set", () => {
    const amount = calculateCouponDiscount({
      discountType: "percentage",
      discountValue: 50,
      maxDiscountAmount: 100,
      eligibleSubtotal: 1000,
    });
    expect(amount).toBe(100); // 50% of 1000 would be 500, capped at 100
  });

  it("fixed: never exceeds the eligible subtotal (can't discount more than the items cost)", () => {
    const amount = calculateCouponDiscount({
      discountType: "fixed",
      discountValue: 500,
      maxDiscountAmount: null,
      eligibleSubtotal: 200,
    });
    expect(amount).toBe(200);
  });

  it("fixed: applies the flat amount when under the eligible subtotal", () => {
    const amount = calculateCouponDiscount({
      discountType: "fixed",
      discountValue: 150,
      maxDiscountAmount: null,
      eligibleSubtotal: 1000,
    });
    expect(amount).toBe(150);
  });
});

describe("distributeDiscount", () => {
  it("splits proportionally across lines by their share of the eligible subtotal", () => {
    const result = distributeDiscount(100, [
      { key: "a", lineSubtotal: 300 },
      { key: "b", lineSubtotal: 700 },
    ]);
    expect(result.get("a")).toBe(30);
    expect(result.get("b")).toBe(70);
  });

  it("folds the rounding remainder into the last line so parts sum exactly to the total", () => {
    const result = distributeDiscount(100, [
      { key: "a", lineSubtotal: 100 },
      { key: "b", lineSubtotal: 100 },
      { key: "c", lineSubtotal: 100 },
    ]);
    const sum = (result.get("a") ?? 0) + (result.get("b") ?? 0) + (result.get("c") ?? 0);
    expect(sum).toBe(100);
    // 100/3 lines = 33.33... each; the last line absorbs the leftover cent(s).
    expect(result.get("a")).toBe(33.33);
    expect(result.get("b")).toBe(33.33);
    expect(result.get("c")).toBe(33.34);
  });

  it("returns an empty map when the discount is zero", () => {
    const result = distributeDiscount(0, [{ key: "a", lineSubtotal: 100 }]);
    expect(result.size).toBe(0);
  });

  it("returns an empty map when there are no eligible lines", () => {
    const result = distributeDiscount(50, []);
    expect(result.size).toBe(0);
  });

  it("puts the whole discount on a single line", () => {
    const result = distributeDiscount(75, [{ key: "only", lineSubtotal: 500 }]);
    expect(result.get("only")).toBe(75);
  });
});
