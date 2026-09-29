import { describe, expect, it } from "vitest";
import { round2 } from "./money";

describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(10.004)).toBe(10);
  });

  it("fixes classic floating-point drift", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in raw JS floats.
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it("handles whole numbers and zero", () => {
    expect(round2(100)).toBe(100);
    expect(round2(0)).toBe(0);
  });

  it("handles negative values", () => {
    expect(round2(-10.001)).toBe(-10);
    expect(round2(-10.006)).toBe(-10.01);
  });
});
