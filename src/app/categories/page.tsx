import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { absoluteUrl, buildOpenGraph } from "@/lib/seo";
import { getTopLevelCategories } from "@/modules/categories/queries";

const TITLE = "Categories";
const DESCRIPTION = "Browse products by category.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/categories") },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, url: absoluteUrl("/categories") }),
};

export default async function CategoriesPage() {
  const categories = await getTopLevelCategories();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-12">
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Categories</h1>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categories.map((category) => (
          <li key={category.id}>
            {category.imageUrl ? (
              <Link
                href={`/categories/${category.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-xl"
              >
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
                  <span className="text-[17px] font-bold text-white">{category.name}</span>
                </div>
              </Link>
            ) : (
              <Link
                href={`/categories/${category.slug}`}
                className="border-border hover:bg-muted flex aspect-[3/4] items-center justify-center rounded-xl border px-4 text-center text-sm font-semibold"
              >
                {category.name}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
