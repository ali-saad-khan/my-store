/**
 * Pure inventory math, isolated from DB access — MasterPlan.txt section 28's "unit tests
 * for inventory calculations." Keep in sync with `isLowStockExpr` in `queries.ts` (that one
 * runs as a SQL expression for filtering; this one is the equivalent in plain JS for
 * call sites, like the low-stock email trigger, that already have the row in hand).
 */

/** Returns `null` when the adjustment would drive quantity on hand below zero. */
export function computeNextQuantity(currentQuantity: number, delta: number): number | null {
  const next = currentQuantity + delta;
  return next < 0 ? null : next;
}

export function isLowStock(
  quantityOnHand: number,
  quantityReserved: number,
  reorderPoint: number,
): boolean {
  return quantityOnHand - quantityReserved <= reorderPoint;
}
