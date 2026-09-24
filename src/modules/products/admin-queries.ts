import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { productVariants, products } from "@/db/schema";

const DEFAULT_ADMIN_PRODUCT_PAGE_SIZE = 20;

export async function listProductsForAdmin(params: { q?: string; page: number }) {
  const pageSize = DEFAULT_ADMIN_PRODUCT_PAGE_SIZE;
  const conditions = [isNull(products.deletedAt)];

  if (params.q) {
    const like = `%${params.q}%`;
    conditions.push(sql`(${products.name} ilike ${like} or ${products.sku} ilike ${like})`);
  }

  const where = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(where);

  const items = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      status: products.status,
      hasVariants: products.hasVariants,
      price: products.price,
      variantCount: sql<number>`count(distinct ${productVariants.id})::int`,
    })
    .from(products)
    .leftJoin(
      productVariants,
      and(eq(productVariants.productId, products.id), isNull(productVariants.deletedAt)),
    )
    .where(where)
    .groupBy(products.id)
    .orderBy(desc(products.createdAt))
    .limit(pageSize)
    .offset((params.page - 1) * pageSize);

  return {
    items,
    page: params.page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

export async function getProductForAdmin(id: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, id), isNull(products.deletedAt)),
    with: {
      images: { orderBy: (image, { asc }) => [asc(image.sortOrder)] },
      productCategories: true,
      inventory: true,
      variants: {
        where: (variant, { isNull }) => isNull(variant.deletedAt),
        orderBy: (variant, { asc }) => [asc(variant.createdAt)],
        with: {
          inventory: true,
          attributeValues: { with: { attributeValue: true } },
        },
      },
    },
  });
  return product ?? null;
}
