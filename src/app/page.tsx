import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { absoluteUrl, buildOpenGraph, SITE_NAME } from "@/lib/seo";
import { getTopLevelCategories } from "@/modules/categories/queries";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { getFeaturedProducts } from "@/modules/products/queries";

const DESCRIPTION = "Quality essentials, delivered across Pakistan.";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
  openGraph: buildOpenGraph({ title: SITE_NAME, description: DESCRIPTION, url: absoluteUrl("/") }),
};

export default async function Home() {
  const [featured, categories] = await Promise.all([
    getFeaturedProducts(8),
    getTopLevelCategories(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold">Shop the collection</h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm">
          Quality essentials, delivered across Pakistan.
        </p>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/products">Shop all products</Link>}
        />
      </section>

      {categories.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Shop by category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="border-border hover:bg-muted rounded-full border px-4 py-1.5 text-sm font-medium"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Featured products</h2>
          <ProductGrid products={featured} />
        </section>
      )}
    </div>
  );
}
