import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schema";

export async function getTopLevelCategories() {
  return db
    .select()
    .from(categories)
    .where(
      and(isNull(categories.parentId), eq(categories.isActive, true), isNull(categories.deletedAt)),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategoryBySlug(slug: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.slug, slug), eq(categories.isActive, true), isNull(categories.deletedAt)),
    )
    .limit(1);

  if (!category) return null;

  const children = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.parentId, category.id),
        eq(categories.isActive, true),
        isNull(categories.deletedAt),
      ),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return { ...category, children };
}
