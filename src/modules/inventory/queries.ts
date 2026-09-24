import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import {
  inventory,
  productAttributeValues,
  productAttributes,
  productVariants,
  products,
  variantAttributeValues,
} from "@/db/schema";
import { DEFAULT_INVENTORY_PAGE_SIZE, type InventoryListSearch } from "@/validations/inventory";

const variantProduct = alias(products, "variant_product");

/** `true` when sellable stock (on hand minus reserved) is at or below the reorder point. */
const isLowStockExpr = sql<boolean>`(${inventory.quantityOnHand} - ${inventory.quantityReserved}) <= ${inventory.reorderPoint}`;
const displayNameExpr = sql<string>`coalesce(${products.name}, ${variantProduct.name})`;
const skuExpr = sql<string>`coalesce(${productVariants.sku}, ${products.sku})`;

function baseQuery() {
  return db
    .select({
      id: inventory.id,
      productId: inventory.productId,
      variantId: inventory.variantId,
      quantityOnHand: inventory.quantityOnHand,
      quantityReserved: inventory.quantityReserved,
      reorderPoint: inventory.reorderPoint,
      productName: displayNameExpr.as("product_name"),
      sku: skuExpr.as("sku"),
      isLowStock: isLowStockExpr.as("is_low_stock"),
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .leftJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .leftJoin(variantProduct, eq(productVariants.productId, variantProduct.id));
}

function buildConditions(search: Pick<InventoryListSearch, "q" | "lowStockOnly">) {
  const conditions = [];

  if (search.q) {
    const like = `%${search.q}%`;
    conditions.push(sql`(${displayNameExpr} ilike ${like} or ${skuExpr} ilike ${like})`);
  }

  if (search.lowStockOnly) {
    conditions.push(isLowStockExpr);
  }

  return conditions;
}

export async function listInventory(search: InventoryListSearch) {
  const pageSize = DEFAULT_INVENTORY_PAGE_SIZE;
  const conditions = buildConditions(search);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .leftJoin(productVariants, eq(inventory.variantId, productVariants.id))
    .leftJoin(variantProduct, eq(productVariants.productId, variantProduct.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const rows = await baseQuery()
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(displayNameExpr))
    .limit(pageSize)
    .offset((search.page - 1) * pageSize);

  const variantLabels = await getVariantLabels(
    rows.filter((row) => row.variantId).map((row) => row.variantId as string),
  );

  return {
    items: rows.map((row) => ({
      ...row,
      quantityAvailable: row.quantityOnHand - row.quantityReserved,
      variantLabel: row.variantId ? (variantLabels.get(row.variantId) ?? null) : null,
    })),
    total: count,
    page: search.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

/** Batched "Small / Black"-style labels for a page of variant ids — avoids N+1 queries. */
async function getVariantLabels(variantIds: string[]) {
  if (variantIds.length === 0) return new Map<string, string>();

  const rows = await db
    .select({
      variantId: variantAttributeValues.variantId,
      attributeName: productAttributes.name,
      value: productAttributeValues.value,
    })
    .from(variantAttributeValues)
    .innerJoin(
      productAttributeValues,
      eq(productAttributeValues.id, variantAttributeValues.attributeValueId),
    )
    .innerJoin(productAttributes, eq(productAttributes.id, productAttributeValues.attributeId))
    .where(inArray(variantAttributeValues.variantId, variantIds))
    .orderBy(asc(productAttributes.name));

  const labels = new Map<string, string[]>();
  for (const row of rows) {
    const values = labels.get(row.variantId) ?? [];
    values.push(row.value);
    labels.set(row.variantId, values);
  }

  return new Map(Array.from(labels, ([variantId, values]) => [variantId, values.join(" / ")]));
}

export async function getInventoryById(id: string) {
  return db.query.inventory.findFirst({
    where: eq(inventory.id, id),
    with: {
      product: true,
      variant: {
        with: {
          product: true,
          attributeValues: { with: { attributeValue: { with: { attribute: true } } } },
        },
      },
      movements: {
        orderBy: (movement, { desc }) => [desc(movement.createdAt)],
        limit: 20,
        with: { createdBy: true },
      },
    },
  });
}

export type InventoryListItem = Awaited<ReturnType<typeof listInventory>>["items"][number];
