import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SavedToast } from "@/components/admin/saved-toast";
import { listAttributesWithValues } from "@/modules/attributes/queries";
import { listCategoryOptions } from "@/modules/categories/queries";
import { getProductForAdmin } from "@/modules/products/admin-queries";
import { ProductForm } from "@/modules/products/components/product-form";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await props.params;
  const [product, categoryOptions, attributes] = await Promise.all([
    getProductForAdmin(id),
    listCategoryOptions(),
    listAttributesWithValues(),
  ]);
  if (!product) notFound();

  const attributeOptions = attributes.map((a) => ({
    id: a.id,
    name: a.name,
    values: a.values.map((v) => ({ id: v.id, value: v.value })),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Suspense fallback={null}>
        <SavedToast message="Product saved." />
      </Suspense>
      <h1 className="text-2xl font-semibold">Edit product</h1>
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          description: product.description,
          shortDescription: product.shortDescription,
          brand: product.brand,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          costPrice: product.costPrice,
          weight: product.weight,
          status: product.status,
          isFeatured: product.isFeatured,
          hasVariants: product.hasVariants,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          seoKeywords: product.seoKeywords,
          categoryIds: product.productCategories.map((pc) => pc.categoryId),
          imageUrls: product.images.map((image) => image.url),
          currentStock: product.inventory[0]?.quantityOnHand ?? null,
          reorderPoint: product.inventory[0]?.reorderPoint,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            costPrice: variant.costPrice,
            weight: variant.weight,
            status: variant.status,
            attributeValues: Object.fromEntries(
              variant.attributeValues.map((av) => [
                av.attributeValue.attributeId,
                av.attributeValue.id,
              ]),
            ),
            currentStock: variant.inventory[0]?.quantityOnHand ?? null,
          })),
        }}
        categoryOptions={categoryOptions}
        attributeOptions={attributeOptions}
      />
    </div>
  );
}
