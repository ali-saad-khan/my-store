import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Pagination } from "@/components/pagination";
import { absoluteUrl, buildBreadcrumbJsonLd, buildOpenGraph } from "@/lib/seo";
import { getCategoryBySlug } from "@/modules/categories/queries";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { listProducts } from "@/modules/products/queries";
import { productListSearchSchema } from "@/validations/catalog";

export async function generateMetadata(props: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const title = category.seoTitle ?? category.name;
  const description = category.seoDescription ?? category.description ?? undefined;
  const url = absoluteUrl(`/categories/${category.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({
      title,
      description,
      url,
      images: category.imageUrl ? [category.imageUrl] : undefined,
    }),
    twitter: { title, description, images: category.imageUrl ? [category.imageUrl] : undefined },
  };
}

export default async function CategoryPage(props: PageProps<"/categories/[slug]">) {
  const { slug } = await props.params;
  const rawSearch = await props.searchParams;
  const search = productListSearchSchema.parse(rawSearch);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const result = await listProducts({ ...search, categorySlug: slug });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: category.name, url: absoluteUrl(`/categories/${category.slug}`) },
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <JsonLd data={breadcrumbJsonLd} />
      <div>
        <h1 className="text-2xl font-semibold">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-1 text-sm">{category.description}</p>
        )}
      </div>

      {category.children.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {category.children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/categories/${child.slug}`}
                className="border-border hover:bg-muted rounded-full border px-3 py-1 text-xs font-medium"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ProductFilters search={search} />
      <ProductGrid products={result.items} />
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => {
          const params = new URLSearchParams();
          if (search.q) params.set("q", search.q);
          if (search.minPrice !== undefined) params.set("minPrice", String(search.minPrice));
          if (search.maxPrice !== undefined) params.set("maxPrice", String(search.maxPrice));
          params.set("sort", search.sort);
          params.set("page", String(page));
          return `/categories/${slug}?${params.toString()}`;
        }}
      />
    </div>
  );
}
