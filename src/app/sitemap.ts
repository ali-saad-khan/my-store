import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { absoluteUrl } from "@/lib/seo";

// The catalog changes via admin CRUD without a redeploy, so a build-time-only
// static sitemap would silently go stale — revalidate hourly instead.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productRows, categoryRows] = await Promise.all([
    db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(and(eq(products.status, "active"), isNull(products.deletedAt))),
    db
      .select({ slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories)
      .where(and(eq(categories.isActive, true), isNull(categories.deletedAt))),
  ]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/categories"), changeFrequency: "weekly", priority: 0.6 },
    ...categoryRows.map((category) => ({
      url: absoluteUrl(`/categories/${category.slug}`),
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...productRows.map((product) => ({
      url: absoluteUrl(`/products/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];
}
