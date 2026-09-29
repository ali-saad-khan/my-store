export type TaxRateRow = { stateId: string | null; rate: string };

/**
 * Picks the applicable rate from a country's active tax rates: a state-specific rate wins
 * over the country-level (state_id IS NULL) fallback. Returns 0 when nothing matches.
 */
export function selectTaxRate(rates: TaxRateRow[], stateId: string | null): number {
  const stateMatch = stateId ? rates.find((r) => r.stateId === stateId) : undefined;
  const countryMatch = rates.find((r) => r.stateId === null);
  return Number((stateMatch ?? countryMatch)?.rate ?? 0);
}
