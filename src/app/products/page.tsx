import type { Metadata } from "next";
import { Pagination } from "@/components/pagination";
import { listProducts } from "@/modules/products/queries";
import { ProductFilters } from "@/modules/products/components/product-filters";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { productListSearchSchema } from "@/validations/catalog";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse the full product catalog.",
};

export default async function ProductsPage(props: PageProps<"/products">) {
  const rawSearch = await props.searchParams;
  const search = productListSearchSchema.parse(rawSearch);

  const result = await listProducts(search);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">All Products</h1>
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
          return `/products?${params.toString()}`;
        }}
      />
    </div>
  );
}
