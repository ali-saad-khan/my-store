import { DEFAULT_MARKET } from "@/config/market";

/**
 * Formats a numeric-string price (as Drizzle returns `numeric` columns) using the
 * market's currency/locale. Only supports the default market for now — this is the
 * one place that changes when multi-currency support is added.
 */
export function formatPrice(amount: string | number, currencyCode = DEFAULT_MARKET.currencyCode) {
  const value = typeof amount === "string" ? Number(amount) : amount;

  return new Intl.NumberFormat(DEFAULT_MARKET.locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: currencyCode === "PKR" ? 0 : 2,
  }).format(value);
}
