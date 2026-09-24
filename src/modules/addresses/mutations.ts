import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { addresses, cities } from "@/db/schema";
import type { AddressInput } from "@/validations/address";

export class CityNotFoundError extends Error {
  constructor() {
    super("Select a valid city.");
    this.name = "CityNotFoundError";
  }
}

/** Resolves a city's country/state — never trust client-supplied geography IDs beyond the city. */
export async function resolveCityGeography(cityId: string) {
  const city = await db.query.cities.findFirst({
    where: eq(cities.id, cityId),
    with: { country: true, state: true },
  });
  if (!city || !city.isActive) throw new CityNotFoundError();
  return city;
}

export async function createAddressForProfile(profileId: string, input: AddressInput) {
  const city = await resolveCityGeography(input.cityId);

  const [address] = await db
    .insert(addresses)
    .values({
      profileId,
      recipientName: input.recipientName,
      phone: input.phone,
      countryId: city.countryId,
      stateId: city.stateId,
      cityId: city.id,
      cityName: city.name,
      line1: input.line1,
      line2: input.line2,
      postalCode: input.postalCode,
    })
    .returning();

  return address;
}
