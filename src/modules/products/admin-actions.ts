"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/session";
import { listAttributesWithValues } from "@/modules/attributes/queries";
import { productBaseSchema, variantRowSchema } from "@/validations/product";
import {
  createProductAdmin,
  DuplicateSkuError,
  NoVariantsError,
  ProductNotFoundError,
  softDeleteProduct,
  updateProductAdmin,
} from "./admin-mutations";
import { InvalidImageFileError, uploadProductImage } from "./storage";

export type ProductActionState = { error?: string } | undefined;

async function parseVariantRows(formData: FormData) {
  const attributes = await listAttributesWithValues();

  const ids = formData.getAll("variantId").map(String);
  const skus = formData.getAll("variantSku").map(String);
  const prices = formData.getAll("variantPrice").map(String);
  const compareAtPrices = formData.getAll("variantCompareAtPrice").map(String);
  const costPrices = formData.getAll("variantCostPrice").map(String);
  const weights = formData.getAll("variantWeight").map(String);
  const statuses = formData.getAll("variantStatus").map(String);
  const initialStocks = formData.getAll("variantInitialStock").map(String);
  const reorderPoints = formData.getAll("variantReorderPoint").map(String);
  const attributeSelections = attributes.map((attribute) =>
    formData.getAll(`variantAttr_${attribute.id}`).map(String),
  );

  return skus.map((_, i) => ({
    id: ids[i],
    sku: skus[i],
    price: prices[i],
    compareAtPrice: compareAtPrices[i],
    costPrice: costPrices[i],
    weight: weights[i],
    status: statuses[i],
    attributeValueIds: attributeSelections.map((selection) => selection[i]).filter(Boolean),
    initialStock: initialStocks[i],
    reorderPoint: reorderPoints[i],
  }));
}

function parseProductBase(formData: FormData) {
  return productBaseSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    sku: formData.get("sku"),
    description: formData.get("description"),
    shortDescription: formData.get("shortDescription"),
    brand: formData.get("brand"),
    price: formData.get("price"),
    compareAtPrice: formData.get("compareAtPrice"),
    costPrice: formData.get("costPrice"),
    weight: formData.get("weight"),
    status: formData.get("status"),
    isFeatured: formData.get("isFeatured"),
    hasVariants: formData.get("hasVariants"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    seoKeywords: formData.get("seoKeywords"),
    categoryIds: formData.getAll("categoryIds"),
    imageUrls: formData.getAll("imageUrl").filter((url) => url !== ""),
    initialStock: formData.get("initialStock"),
    reorderPoint: formData.get("reorderPoint"),
  });
}

function firstZodError(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.values(error.flatten().fieldErrors).flat()[0];
}

/** Uploads any admin-selected image files to Supabase Storage, returning their public URLs. */
async function uploadImageFiles(formData: FormData): Promise<string[]> {
  const files = formData.getAll("imageFile").filter((f): f is File => f instanceof File && f.size > 0);
  return Promise.all(files.map(uploadProductImage));
}

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const admin = await requireAdmin();

  const parsedBase = parseProductBase(formData);
  if (!parsedBase.success) return { error: firstZodError(parsedBase.error) ?? "Invalid input." };

  let uploadedImageUrls: string[];
  try {
    uploadedImageUrls = await uploadImageFiles(formData);
  } catch (error) {
    if (error instanceof InvalidImageFileError) return { error: error.message };
    throw error;
  }
  parsedBase.data.imageUrls = [...parsedBase.data.imageUrls, ...uploadedImageUrls];

  const rawVariants = parsedBase.data.hasVariants ? await parseVariantRows(formData) : [];
  const parsedVariants = [];
  for (const raw of rawVariants) {
    const parsed = variantRowSchema.safeParse(raw);
    if (!parsed.success) return { error: firstZodError(parsed.error) ?? "Invalid variant." };
    parsedVariants.push(parsed.data);
  }
  if (parsedBase.data.hasVariants && parsedVariants.length === 0) {
    return { error: "Add at least one variant." };
  }

  let product;
  try {
    product = await createProductAdmin(parsedBase.data, parsedVariants, admin.id);
  } catch (error) {
    if (error instanceof DuplicateSkuError) return { error: error.message };
    throw error;
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}/edit`);
}

export async function updateProductAction(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const admin = await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Invalid product." };

  const parsedBase = parseProductBase(formData);
  if (!parsedBase.success) return { error: firstZodError(parsedBase.error) ?? "Invalid input." };

  let uploadedImageUrls: string[];
  try {
    uploadedImageUrls = await uploadImageFiles(formData);
  } catch (error) {
    if (error instanceof InvalidImageFileError) return { error: error.message };
    throw error;
  }
  parsedBase.data.imageUrls = [...parsedBase.data.imageUrls, ...uploadedImageUrls];

  // Always parse variant rows here, regardless of the submitted `hasVariants`
  // flag: updateProductAdmin authoritatively re-derives hasVariants from the
  // DB (it can't be edited), so if that flag were ever wrong, an empty
  // `[]` here would silently archive every existing variant.
  const rawVariants = await parseVariantRows(formData);
  const parsedVariants = [];
  for (const raw of rawVariants) {
    const parsed = variantRowSchema.safeParse(raw);
    if (!parsed.success) return { error: firstZodError(parsed.error) ?? "Invalid variant." };
    parsedVariants.push(parsed.data);
  }

  try {
    await updateProductAdmin(id, parsedBase.data, parsedVariants, admin.id);
  } catch (error) {
    if (
      error instanceof DuplicateSkuError ||
      error instanceof ProductNotFoundError ||
      error instanceof NoVariantsError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}/edit`);
  redirect(`/admin/products/${id}/edit?saved=1`);
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await softDeleteProduct(id);
  revalidatePath("/admin/products");
}
