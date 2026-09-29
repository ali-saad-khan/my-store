import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { categories } from "@/db/schema";

const parentCategory = alias(categories, "parent_category");

/** Cached — see the same note on `getFeaturedProducts`; invalidated via `revalidateTag`
 * from the category admin actions. */
export const getTopLevelCategories = unstable_cache(
  async () =>
    db
      .select()
      .from(categories)
      .where(
        and(isNull(categories.parentId), eq(categories.isActive, true), isNull(categories.deletedAt)),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ["top-level-categories"],
  { tags: ["categories"], revalidate: 60 },
);

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

export async function listCategoriesForAdmin() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      isActive: categories.isActive,
      sortOrder: categories.sortOrder,
      parentName: parentCategory.name,
    })
    .from(categories)
    .leftJoin(parentCategory, eq(parentCategory.id, categories.parentId))
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getCategoryByIdForAdmin(id: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
    .limit(1);
  return category ?? null;
}

/** For the parent-category picker — excludes the category being edited (can't be its own parent). */
export async function listCategoryOptions(excludeId?: string) {
  const rows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.name));
  return excludeId ? rows.filter((row) => row.id !== excludeId) : rows;
}
