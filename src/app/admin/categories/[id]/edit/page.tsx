import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/modules/categories/components/category-form";
import { getCategoryByIdForAdmin, listCategoryOptions } from "@/modules/categories/queries";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage(props: PageProps<"/admin/categories/[id]/edit">) {
  const { id } = await props.params;
  const [category, parentOptions] = await Promise.all([
    getCategoryByIdForAdmin(id),
    listCategoryOptions(id),
  ]);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit category</h1>
      <CategoryForm category={category} parentOptions={parentOptions} />
    </div>
  );
}
