import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import {
  categories,
  productCategories,
  productImages,
  productVariants,
  products,
} from "@/db/schema";
import { DEFAULT_PAGE_SIZE, type ProductListSearch } from "@/validations/catalog";

/** MIN(coalesce(variant price, base price)) — the price shown on a product card. */
const displayPriceExpr = sql<string>`min(coalesce(${productVariants.price}, ${products.price}))`;

type ListProductsParams = ProductListSearch & {
  categorySlug?: string;
  pageSize?: number;
};

export async function listProducts(params: ListProductsParams) {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  const baseConditions = [eq(products.status, "active"), isNull(products.deletedAt)];

  if (params.q) {
    const like = `%${params.q}%`;
    baseConditions.push(
      sql`(${products.name} ilike ${like} or ${products.shortDescription} ilike ${like})`,
    );
  }

  if (params.categorySlug) {
    baseConditions.push(
      inArray(
        products.id,
        db
          .select({ id: productCategories.productId })
          .from(productCategories)
          .innerJoin(categories, eq(categories.id, productCategories.categoryId))
          .where(eq(categories.slug, params.categorySlug)),
      ),
    );
  }

  const havingConditions = [];
  if (params.minPrice !== undefined)
    havingConditions.push(gte(displayPriceExpr, String(params.minPrice)));
  if (params.maxPrice !== undefined)
    havingConditions.push(lte(displayPriceExpr, String(params.maxPrice)));

  const filtered = db
    .select({ id: products.id, displayPrice: displayPriceExpr.as("display_price") })
    .from(products)
    .leftJoin(
      productVariants,
      and(eq(productVariants.productId, products.id), isNull(productVariants.deletedAt)),
    )
    .where(and(...baseConditions))
    .groupBy(products.id)
    .having(havingConditions.length > 0 ? and(...havingConditions) : undefined)
    .as("filtered");

  const orderBy = {
    newest: [desc(products.createdAt)],
    price_asc: [asc(filtered.displayPrice)],
    price_desc: [desc(filtered.displayPrice)],
    name_asc: [asc(products.name)],
  }[params.sort];

  // Independent of each other (both only depend on `filtered`) — run in parallel rather
  // than paying for two sequential round-trips.
  const [[{ count }], rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(filtered),
    db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        shortDescription: products.shortDescription,
        brand: products.brand,
        compareAtPrice: products.compareAtPrice,
        isFeatured: products.isFeatured,
        displayPrice: filtered.displayPrice,
      })
      .from(products)
      .innerJoin(filtered, eq(filtered.id, products.id))
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset((params.page - 1) * pageSize),
  ]);

  const images = await getPrimaryImages(rows.map((row) => row.id));

  return {
    items: rows.map((row) => ({ ...row, imageUrl: images.get(row.id) ?? null })),
    total: count,
    page: params.page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  };
}

async function getPrimaryImages(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, string>();

  const rows = await db
    .selectDistinctOn([productImages.productId], {
      productId: productImages.productId,
      url: productImages.url,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.productId), asc(productImages.sortOrder));

  return new Map(rows.map((row) => [row.productId, row.url]));
}

/**
 * Cached (not `fetch`-based, so route-level `revalidate` doesn't apply — see
 * `unstable_cache` docs) since the homepage calls this on every visit and the data is
 * identical for every visitor. Invalidated early via `revalidateTag("products")` from the
 * admin product actions, so an admin's own edit still shows up immediately; otherwise
 * refreshed at most once a minute.
 */
export const getFeaturedProducts = unstable_cache(
  async (limit = 4) => {
    const rows = await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        shortDescription: products.shortDescription,
        brand: products.brand,
        compareAtPrice: products.compareAtPrice,
        isFeatured: products.isFeatured,
        displayPrice: displayPriceExpr.as("display_price"),
      })
      .from(products)
      .leftJoin(
        productVariants,
        and(eq(productVariants.productId, products.id), isNull(productVariants.deletedAt)),
      )
      .where(
        and(eq(products.status, "active"), isNull(products.deletedAt), eq(products.isFeatured, true)),
      )
      .groupBy(products.id)
      .orderBy(desc(products.createdAt))
      .limit(limit);

    const images = await getPrimaryImages(rows.map((row) => row.id));
    return rows.map((row) => ({ ...row, imageUrl: images.get(row.id) ?? null }));
  },
  ["featured-products"],
  { tags: ["products"], revalidate: 60 },
);

export async function getProductBySlug(slug: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "active"), isNull(products.deletedAt)),
    with: {
      images: { orderBy: (image, { asc }) => [asc(image.sortOrder)] },
      variants: {
        where: (variant, { isNull }) => isNull(variant.deletedAt),
        with: {
          images: true,
          attributeValues: { with: { attributeValue: { with: { attribute: true } } } },
          inventory: true,
        },
      },
      inventory: true,
      productCategories: { with: { category: true } },
    },
  });

  return product ?? null;
}
