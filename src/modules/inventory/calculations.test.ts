import { describe, expect, it } from "vitest";
import { computeNextQuantity, isLowStock } from "./calculations";

describe("computeNextQuantity", () => {
  it("adds a positive delta (restock)", () => {
    expect(computeNextQuantity(10, 5)).toBe(15);
  });

  it("subtracts a negative delta (sale)", () => {
    expect(computeNextQuantity(10, -5)).toBe(5);
  });

  it("allows landing exactly on zero", () => {
    expect(computeNextQuantity(10, -10)).toBe(0);
  });

  it("returns null instead of going negative", () => {
    expect(computeNextQuantity(10, -11)).toBeNull();
  });
});

describe("isLowStock", () => {
  it("is true when available stock is below the reorder point", () => {
    expect(isLowStock(4, 0, 5)).toBe(true);
  });

  it("is true when available stock exactly equals the reorder point", () => {
    expect(isLowStock(5, 0, 5)).toBe(true);
  });

  it("is false when available stock is above the reorder point", () => {
    expect(isLowStock(6, 0, 5)).toBe(false);
  });

  it("accounts for reserved stock, not just quantity on hand", () => {
    // 20 on hand but 16 reserved for pending orders — only 4 truly available.
    expect(isLowStock(20, 16, 5)).toBe(true);
  });
});
