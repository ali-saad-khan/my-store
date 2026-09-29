import { describe, expect, it } from "vitest";
import { selectTaxRate } from "./tax";

describe("selectTaxRate", () => {
  it("returns 0 when no rates exist for the country", () => {
    expect(selectTaxRate([], "state-1")).toBe(0);
  });

  it("falls back to the country-level rate (stateId null) when no state matches", () => {
    const rates = [{ stateId: null, rate: "5.0000" }];
    expect(selectTaxRate(rates, "state-1")).toBe(5);
  });

  it("prefers a state-specific rate over the country-level fallback", () => {
    const rates = [
      { stateId: null, rate: "5.0000" },
      { stateId: "state-1", rate: "8.5000" },
    ];
    expect(selectTaxRate(rates, "state-1")).toBe(8.5);
  });

  it("uses the country-level rate when stateId is null (no state on the address)", () => {
    const rates = [
      { stateId: null, rate: "5.0000" },
      { stateId: "state-1", rate: "8.5000" },
    ];
    expect(selectTaxRate(rates, null)).toBe(5);
  });
});
