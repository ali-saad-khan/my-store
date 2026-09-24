import "server-only";
import { db } from "@/db/client";

/** All global product attributes (Size, Color, ...) with their values, for the variant editor. */
export async function listAttributesWithValues() {
  return db.query.productAttributes.findMany({
    with: { values: { orderBy: (value, { asc }) => [asc(value.sortOrder)] } },
    orderBy: (attribute, { asc }) => [asc(attribute.name)],
  });
}
