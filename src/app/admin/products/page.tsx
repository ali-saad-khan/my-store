import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/pagination";
import { formatPrice } from "@/lib/currency";
import { DeleteProductButton } from "@/modules/products/components/delete-product-button";
import { listProductsForAdmin } from "@/modules/products/admin-queries";

export const metadata: Metadata = { title: "Products" };

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const searchSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  page: z.coerce.number().int().min(1).default(1),
});

export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const rawSearch = await props.searchParams;
  const search = searchSchema.parse(rawSearch);
  const result = await listProductsForAdmin(search);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground text-sm">{result.total} total.</p>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/products/new">New product</Link>}
        />
      </div>

      <form className="flex flex-wrap items-end gap-3" aria-label="Filter products">
        <div className="min-w-[10rem] flex-1 space-y-1.5">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            type="search"
            placeholder="Name or SKU..."
            defaultValue={search.q}
          />
        </div>
        <Button type="submit" size="sm">
          Apply
        </Button>
      </form>

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">SKU / Variants</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {result.items.map((product) => (
              <tr key={product.id}>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="font-medium underline"
                  >
                    {product.name}
                  </Link>
                </td>
                <td className="text-muted-foreground px-3 py-2">
                  {product.hasVariants ? `${product.variantCount} variants` : (product.sku ?? "—")}
                </td>
                <td className="px-3 py-2">{product.status}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {product.price ? formatPrice(product.price) : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <DeleteProductButton productId={product.id} productName={product.name} />
                </td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-3 py-8 text-center">
                  No products match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => {
          const params = new URLSearchParams();
          if (search.q) params.set("q", search.q);
          params.set("page", String(page));
          return `/admin/products?${params.toString()}`;
        }}
      />
    </div>
  );
}
