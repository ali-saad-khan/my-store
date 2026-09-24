import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteCategoryButton } from "@/modules/categories/components/delete-category-button";
import { listCategoriesForAdmin } from "@/modules/categories/queries";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesForAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/categories/new">New category</Link>}
        />
      </div>

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Parent</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/categories/${category.id}/edit`}
                    className="font-medium underline"
                  >
                    {category.name}
                  </Link>
                  <div className="text-muted-foreground">{category.slug}</div>
                </td>
                <td className="text-muted-foreground px-3 py-2">{category.parentName ?? "—"}</td>
                <td className="px-3 py-2">{category.isActive ? "Active" : "Inactive"}</td>
                <td className="px-3 py-2 text-right">
                  <DeleteCategoryButton categoryId={category.id} categoryName={category.name} />
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-3 py-8 text-center">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
