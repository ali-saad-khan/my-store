import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schema";
import type { CategoryInput } from "@/validations/category";

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category not found.");
    this.name = "CategoryNotFoundError";
  }
}

export class DuplicateSlugError extends Error {
  constructor() {
    super("A category with that slug already exists.");
    this.name = "DuplicateSlugError";
  }
}

export class SelfParentError extends Error {
  constructor() {
    super("A category can't be its own parent.");
    this.name = "SelfParentError";
  }
}

export async function createCategory(input: CategoryInput) {
  try {
    const [category] = await db.insert(categories).values(input).returning();
    return category;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateSlugError();
    throw error;
  }
}

export async function updateCategory(id: string, input: CategoryInput) {
  if (input.parentId === id) throw new SelfParentError();

  try {
    const [category] = await db
      .update(categories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    if (!category) throw new CategoryNotFoundError();
    return category;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateSlugError();
    throw error;
  }
}

export async function softDeleteCategory(id: string) {
  const [category] = await db
    .update(categories)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();
  if (!category) throw new CategoryNotFoundError();
  return category;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
