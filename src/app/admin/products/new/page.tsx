import type { Metadata } from "next";
import { listAttributesWithValues } from "@/modules/attributes/queries";
import { listCategoryOptions } from "@/modules/categories/queries";
import { ProductForm } from "@/modules/products/components/product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const [categoryOptions, attributes] = await Promise.all([
    listCategoryOptions(),
    listAttributesWithValues(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">New product</h1>
      <ProductForm
        categoryOptions={categoryOptions}
        attributeOptions={attributes.map((a) => ({
          id: a.id,
          name: a.name,
          values: a.values.map((v) => ({ id: v.id, value: v.value })),
        }))}
      />
    </div>
  );
}
