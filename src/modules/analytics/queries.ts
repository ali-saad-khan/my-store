import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { analyticsEvents, products } from "@/db/schema";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getEventCountsLast30Days() {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  return db
    .select({ eventName: analyticsEvents.eventName, count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(analyticsEvents.eventName)
    .orderBy(desc(sql`count(*)`));
}

/** Most-viewed products in the last 30 days, joined back to the product for a display name. */
export async function getMostViewedProductsLast30Days(limit = 5) {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const productIdExpr = sql<string>`${analyticsEvents.properties}->>'productId'`;

  const rows = await db
    .select({ productId: productIdExpr, count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(
      and(eq(analyticsEvents.eventName, "product_viewed"), gte(analyticsEvents.createdAt, since)),
    )
    .groupBy(productIdExpr)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  const productIds = rows.map((row) => row.productId).filter(Boolean);
  if (productIds.length === 0) return [];

  const productRows = await db
    .select({ id: products.id, name: products.name, slug: products.slug })
    .from(products)
    .where(inArray(products.id, productIds));
  const productsById = new Map(productRows.map((product) => [product.id, product]));

  return rows
    .map((row) => ({ ...row, product: productsById.get(row.productId) }))
    .filter((row): row is typeof row & { product: NonNullable<typeof row.product> } =>
      Boolean(row.product),
    );
}
