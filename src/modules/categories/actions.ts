"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/session";
import { categoryInputSchema } from "@/validations/category";
import {
  createCategory,
  DuplicateSlugError,
  SelfParentError,
  softDeleteCategory,
  updateCategory,
} from "./mutations";

export type CategoryActionState = { error?: string } | undefined;

function parseCategoryForm(formData: FormData) {
  return categoryInputSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    parentId: formData.get("parentId"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    isActive: formData.get("isActive"),
    sortOrder: formData.get("sortOrder"),
  });
}

export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? "Invalid input." };
  }

  try {
    await createCategory(parsed.data);
  } catch (error) {
    if (error instanceof DuplicateSlugError) return { error: error.message };
    throw error;
  }

  revalidatePath("/admin/categories");
  updateTag("categories");
  redirect("/admin/categories?saved=1");
}

export async function updateCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Invalid category." };

  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? "Invalid input." };
  }

  try {
    await updateCategory(id, parsed.data);
  } catch (error) {
    if (error instanceof DuplicateSlugError || error instanceof SelfParentError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/categories");
  updateTag("categories");
  redirect("/admin/categories?saved=1");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await softDeleteCategory(id);
  revalidatePath("/admin/categories");
  updateTag("categories");
}
