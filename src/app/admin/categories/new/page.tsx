import type { Metadata } from "next";
import { CategoryForm } from "@/modules/categories/components/category-form";
import { listCategoryOptions } from "@/modules/categories/queries";

export const metadata: Metadata = { title: "New category" };

export default async function NewCategoryPage() {
  const parentOptions = await listCategoryOptions();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New category</h1>
      <CategoryForm parentOptions={parentOptions} />
    </div>
  );
}
