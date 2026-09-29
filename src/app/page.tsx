import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroBannerSlider } from "@/components/hero-banner-slider";
import { getActiveBanners } from "@/modules/banners/queries";
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
  const [featured, categories, banners] = await Promise.all([
    getFeaturedProducts(8),
    getTopLevelCategories(),
    getActiveBanners(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8">
      {banners.length > 0 ? (
        <HeroBannerSlider slides={banners} />
      ) : (
        <section className="space-y-4 text-center">
          <h1 className="text-3xl font-semibold">Shop the collection</h1>
          <p className="text-muted-foreground mx-auto max-w-md text-sm">{DESCRIPTION}</p>
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/products">Shop all products</Link>}
          />
        </section>
      )}

      {categories.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((category) =>
              category.imageUrl ? (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg"
                >
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3">
                    <span className="text-sm font-medium text-white">{category.name}</span>
                  </div>
                </Link>
              ) : (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="border-border hover:bg-muted flex aspect-[4/3] items-center justify-center rounded-lg border px-4 text-center text-sm font-medium"
                >
                  {category.name}
                </Link>
              ),
            )}
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
