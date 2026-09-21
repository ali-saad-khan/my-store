/**
 * Default market configuration.
 *
 * This is the ONLY place default country/currency/locale values should live.
 * Business logic elsewhere must read from here (or from the database, once
 * countries/currencies/shipping-zones tables exist in Phase 1+) rather than
 * hard-coding "PKR", "Pakistan", etc.
 */
export const DEFAULT_MARKET = {
  countryCode: "PK",
  countryName: "Pakistan",
  currencyCode: "PKR",
  timezone: "Asia/Karachi",
  locale: "en-PK",
} as const;
