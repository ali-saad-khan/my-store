import { describe, expect, it } from "vitest";
import { calculateShippingCost } from "./shipping-cost";

const baseRate = {
  baseRate: "200.00",
  minOrderValue: null,
  freeShippingThreshold: null,
  perKgRate: null,
};

describe("calculateShippingCost", () => {
  it("returns null when below the rate's minimum order value", () => {
    const cost = calculateShippingCost(
      { ...baseRate, rateType: "flat", minOrderValue: "1000.00" },
      { subtotal: 500, totalWeightKg: 1 },
    );
    expect(cost).toBeNull();
  });

  it("free: always costs 0", () => {
    const cost = calculateShippingCost(
      { ...baseRate, rateType: "free" },
      { subtotal: 1, totalWeightKg: 1 },
    );
    expect(cost).toBe(0);
  });

  it("flat: always the base rate regardless of subtotal/weight", () => {
    const cost = calculateShippingCost(
      { ...baseRate, rateType: "flat" },
      { subtotal: 50000, totalWeightKg: 100 },
    );
    expect(cost).toBe(200);
  });

  it("order_value_based: charges the base rate below the free-shipping threshold", () => {
    const cost = calculateShippingCost(
      { ...baseRate, rateType: "order_value_based", freeShippingThreshold: "5000.00" },
      { subtotal: 4999, totalWeightKg: 1 },
    );
    expect(cost).toBe(200);
  });

  it("order_value_based: free at or above the threshold", () => {
    const cost = calculateShippingCost(
      { ...baseRate, rateType: "order_value_based", freeShippingThreshold: "5000.00" },
      { subtotal: 5000, totalWeightKg: 1 },
    );
    expect(cost).toBe(0);
  });

  it("weight_based: base rate plus per-kg rate times total weight", () => {
    const cost = calculateShippingCost(
      { ...baseRate, rateType: "weight_based", perKgRate: "50.00" },
      { subtotal: 1000, totalWeightKg: 3 },
    );
    expect(cost).toBe(350); // 200 + 50*3
  });

  it("weight_based: treats a missing per-kg rate as 0", () => {
    const cost = calculateShippingCost(
      { ...baseRate, rateType: "weight_based", perKgRate: null },
      { subtotal: 1000, totalWeightKg: 3 },
    );
    expect(cost).toBe(200);
  });
});
