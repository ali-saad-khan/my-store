import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  cities,
  paymentMethods,
  shippingRates,
  shippingZoneLocations,
  shippingZones,
} from "@/db/schema";

/**
 * Resolves each active city to its shipping zone (most specific
 * `shipping_zone_locations` match wins: city > state > country-wide
 * catch-all), and returns each zone's active rates alongside it — everything
 * the checkout form needs to let a city selection drive shipping options
 * without a server round-trip. MasterPlan.txt section 13: never hard-code
 * city/zone assignments in application logic.
 */
export async function getCheckoutGeography() {
  const activeCities = await db.query.cities.findMany({
    where: eq(cities.isActive, true),
    orderBy: [asc(cities.name)],
  });

  const zoneLocations = await db
    .select()
    .from(shippingZoneLocations)
    .innerJoin(shippingZones, eq(shippingZones.id, shippingZoneLocations.zoneId))
    .where(eq(shippingZones.isActive, true));

  const cityZoneId = new Map<string, string>();
  for (const city of activeCities) {
    const match = zoneLocations
      .map((row) => row.shipping_zone_locations)
      .filter((location) => location.countryId === city.countryId)
      .sort((a, b) => specificity(b) - specificity(a))
      .find(
        (location) =>
          (location.cityId === null || location.cityId === city.id) &&
          (location.stateId === null || location.stateId === city.stateId),
      );
    if (match) cityZoneId.set(city.id, match.zoneId);
  }

  const zoneIds = [...new Set(cityZoneId.values())];
  const rates =
    zoneIds.length > 0
      ? await db
          .select()
          .from(shippingRates)
          .where(and(inArray(shippingRates.zoneId, zoneIds), eq(shippingRates.isActive, true)))
          .orderBy(asc(shippingRates.sortOrder))
      : [];

  return {
    cities: activeCities.map((city) => ({
      id: city.id,
      name: city.name,
      zoneId: cityZoneId.get(city.id) ?? null,
    })),
    ratesByZoneId: Map.groupBy(rates, (rate) => rate.zoneId),
  };
}

function specificity(location: { stateId: string | null; cityId: string | null }) {
  if (location.cityId) return 2;
  if (location.stateId) return 1;
  return 0;
}

export async function getActivePaymentMethods() {
  return db.query.paymentMethods.findMany({
    where: eq(paymentMethods.isActive, true),
    orderBy: [asc(paymentMethods.sortOrder)],
  });
}
