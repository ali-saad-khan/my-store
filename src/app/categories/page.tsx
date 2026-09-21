import type { Metadata } from "next";
import Link from "next/link";
import { getTopLevelCategories } from "@/modules/categories/queries";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse products by category.",
};

export default async function CategoriesPage() {
  const categories = await getTopLevelCategories();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/categories/${category.slug}`}
              className="border-border hover:bg-muted block rounded-lg border p-4 text-center text-sm font-medium"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
