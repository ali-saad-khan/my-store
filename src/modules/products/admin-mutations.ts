import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  inventory,
  inventoryMovements,
  productCategories,
  productImages,
  products,
  productVariants,
  variantAttributeValues,
} from "@/db/schema";
import type { DbTransaction } from "@/modules/inventory/mutations";
import type { ProductBaseInput, VariantRowInput } from "@/validations/product";

export class DuplicateSkuError extends Error {
  constructor() {
    super("That SKU is already in use.");
    this.name = "DuplicateSkuError";
  }
}

export class ProductNotFoundError extends Error {
  constructor() {
    super("Product not found.");
    this.name = "ProductNotFoundError";
  }
}

export class NoVariantsError extends Error {
  constructor() {
    super("A variant product needs at least one variant.");
    this.name = "NoVariantsError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function createProductAdmin(
  input: ProductBaseInput,
  variants: VariantRowInput[],
  actorId: string | null,
) {
  return db.transaction(async (tx) => {
    let product;
    try {
      [product] = await tx
        .insert(products)
        .values({
          name: input.name,
          slug: input.slug,
          sku: input.hasVariants ? undefined : input.sku,
          description: input.description,
          shortDescription: input.shortDescription,
          brand: input.brand,
          price: input.hasVariants ? undefined : input.price,
          compareAtPrice: input.hasVariants ? undefined : input.compareAtPrice,
          costPrice: input.hasVariants ? undefined : input.costPrice,
          weight: input.hasVariants ? undefined : input.weight,
          status: input.status,
          isFeatured: input.isFeatured,
          hasVariants: input.hasVariants,
          seoTitle: input.seoTitle,
          seoDescription: input.seoDescription,
          seoKeywords: input.seoKeywords,
        })
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateSkuError();
      throw error;
    }

    await syncCategories(tx, product.id, input.categoryIds);
    await syncImages(tx, product.id, input.imageUrls);

    if (input.hasVariants) {
      for (const variant of variants) {
        await createVariantTx(tx, product.id, variant, actorId);
      }
    } else {
      await createInventoryRowTx(
        tx,
        { productId: product.id },
        input.initialStock,
        input.reorderPoint,
        actorId,
      );
    }

    return product;
  });
}

/**
 * `hasVariants` can't be changed here — flipping a product between
 * simple/variant-based mid-life would orphan its inventory row (product-
 * level vs variant-level are mutually exclusive). The edit form only
 * submits it as a fixed hidden field.
 */
export async function updateProductAdmin(
  id: string,
  input: ProductBaseInput,
  variants: VariantRowInput[],
  actorId: string | null,
) {
  return db.transaction(async (tx) => {
    // `hasVariants` can't be edited (see the doc comment above), and the
    // form's disabled checkbox for it never submits — always trust the
    // persisted value here, never `input.hasVariants`.
    const [existing] = await tx
      .select({ hasVariants: products.hasVariants })
      .from(products)
      .where(eq(products.id, id));
    if (!existing) throw new ProductNotFoundError();
    const hasVariants = existing.hasVariants;

    let product;
    try {
      [product] = await tx
        .update(products)
        .set({
          name: input.name,
          slug: input.slug,
          sku: hasVariants ? null : (input.sku ?? null),
          description: input.description ?? null,
          shortDescription: input.shortDescription ?? null,
          brand: input.brand ?? null,
          price: hasVariants ? null : (input.price ?? null),
          compareAtPrice: hasVariants ? null : (input.compareAtPrice ?? null),
          costPrice: hasVariants ? null : (input.costPrice ?? null),
          weight: hasVariants ? null : (input.weight ?? null),
          status: input.status,
          isFeatured: input.isFeatured,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          seoKeywords: input.seoKeywords ?? null,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateSkuError();
      throw error;
    }
    if (!product) throw new ProductNotFoundError();

    await syncCategories(tx, id, input.categoryIds);
    await syncImages(tx, id, input.imageUrls);

    if (hasVariants) {
      if (variants.length === 0) throw new NoVariantsError();
      await syncVariants(tx, id, variants, actorId);
    } else {
      const [existingInventory] = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.productId, id));
      if (existingInventory) {
        await tx
          .update(inventory)
          .set({ reorderPoint: input.reorderPoint, updatedAt: new Date() })
          .where(eq(inventory.id, existingInventory.id));
      } else {
        await createInventoryRowTx(
          tx,
          { productId: id },
          input.initialStock,
          input.reorderPoint,
          actorId,
        );
      }
    }

    return product;
  });
}

async function syncCategories(tx: DbTransaction, productId: string, categoryIds: string[]) {
  await tx.delete(productCategories).where(eq(productCategories.productId, productId));
  if (categoryIds.length > 0) {
    await tx
      .insert(productCategories)
      .values(categoryIds.map((categoryId) => ({ productId, categoryId })));
  }
}

async function syncImages(tx: DbTransaction, productId: string, imageUrls: string[]) {
  await tx.delete(productImages).where(eq(productImages.productId, productId));
  if (imageUrls.length > 0) {
    await tx
      .insert(productImages)
      .values(imageUrls.map((url, sortOrder) => ({ productId, url, sortOrder })));
  }
}

/**
 * Updates variants that already exist (matched by id), creates variants
 * submitted without one, and archives (never hard-deletes) existing
 * variants the form no longer includes — preserving their order history.
 */
async function syncVariants(
  tx: DbTransaction,
  productId: string,
  variants: VariantRowInput[],
  actorId: string | null,
) {
  const existingVariants = await tx
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), isNull(productVariants.deletedAt)));

  const submittedIds = new Set(variants.filter((v) => v.id).map((v) => v.id));

  for (const variant of variants) {
    if (variant.id) {
      try {
        await tx
          .update(productVariants)
          .set({
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            costPrice: variant.costPrice,
            weight: variant.weight,
            status: variant.status,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, variant.id));
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateSkuError();
        throw error;
      }

      await tx
        .delete(variantAttributeValues)
        .where(eq(variantAttributeValues.variantId, variant.id));
      if (variant.attributeValueIds.length > 0) {
        await tx.insert(variantAttributeValues).values(
          variant.attributeValueIds.map((attributeValueId) => ({
            variantId: variant.id!,
            attributeValueId,
          })),
        );
      }

      await tx
        .update(inventory)
        .set({ reorderPoint: variant.reorderPoint, updatedAt: new Date() })
        .where(eq(inventory.variantId, variant.id));
    } else {
      await createVariantTx(tx, productId, variant, actorId);
    }
  }

  const toArchive = existingVariants.filter((v) => !submittedIds.has(v.id));
  if (toArchive.length > 0) {
    await tx
      .update(productVariants)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        inArray(
          productVariants.id,
          toArchive.map((v) => v.id),
        ),
      );
  }
}

async function createVariantTx(
  tx: DbTransaction,
  productId: string,
  variant: VariantRowInput,
  actorId: string | null,
) {
  let variantRow;
  try {
    [variantRow] = await tx
      .insert(productVariants)
      .values({
        productId,
        sku: variant.sku,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        costPrice: variant.costPrice,
        weight: variant.weight,
        status: variant.status,
      })
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateSkuError();
    throw error;
  }

  if (variant.attributeValueIds.length > 0) {
    await tx.insert(variantAttributeValues).values(
      variant.attributeValueIds.map((attributeValueId) => ({
        variantId: variantRow.id,
        attributeValueId,
      })),
    );
  }

  await createInventoryRowTx(
    tx,
    { variantId: variantRow.id },
    variant.initialStock,
    variant.reorderPoint,
    actorId,
  );
  return variantRow;
}

async function createInventoryRowTx(
  tx: DbTransaction,
  target: { productId: string } | { variantId: string },
  initialStock: number,
  reorderPoint: number,
  actorId: string | null,
) {
  const [inventoryRow] = await tx
    .insert(inventory)
    .values({ ...target, quantityOnHand: initialStock, reorderPoint })
    .returning();

  if (initialStock > 0) {
    await tx.insert(inventoryMovements).values({
      inventoryId: inventoryRow.id,
      type: "purchase",
      quantity: initialStock,
      note: "Initial stock on creation.",
      createdBy: actorId,
    });
  }

  return inventoryRow;
}

export async function softDeleteProduct(id: string) {
  const [product] = await db
    .update(products)
    .set({ deletedAt: new Date(), status: "archived", updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  if (!product) throw new ProductNotFoundError();
  return product;
}
