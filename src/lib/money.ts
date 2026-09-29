/** Rounds to 2 decimal places — the one place every money calculation in the app goes through. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
