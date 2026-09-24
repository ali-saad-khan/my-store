import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { addresses } from "@/db/schema";

export async function listAddressesForProfile(profileId: string) {
  return db.query.addresses.findMany({
    where: and(eq(addresses.profileId, profileId), isNull(addresses.deletedAt)),
    with: { city: true, state: true, country: true },
    orderBy: [desc(addresses.isDefaultShipping), asc(addresses.createdAt)],
  });
}

export async function getAddressForProfile(addressId: string, profileId: string) {
  return db.query.addresses.findFirst({
    where: and(
      eq(addresses.id, addressId),
      eq(addresses.profileId, profileId),
      isNull(addresses.deletedAt),
    ),
    with: { city: true, state: true, country: true },
  });
}
