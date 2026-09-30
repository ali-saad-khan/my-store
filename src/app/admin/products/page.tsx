import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { PageHeader } from "@/components/admin/page-header";
import { RowActionsMenu } from "@/components/admin/row-actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { formatPrice } from "@/lib/currency";
import { deleteProductAction } from "@/modules/products/admin-actions";
import { listProductsForAdmin } from "@/modules/products/admin-queries";
import { PRODUCT_STATUS_BADGE_VARIANT } from "@/validations/product";

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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Products"
        description={`${result.total} total.`}
        action={
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/products/new">New product</Link>}
          />
        }
      />

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

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU / Variants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="font-medium underline"
                  >
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {product.hasVariants ? `${product.variantCount} variants` : (product.sku ?? "—")}
                </TableCell>
                <TableCell>
                  <Badge variant={PRODUCT_STATUS_BADGE_VARIANT[product.status]}>
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {product.price ? formatPrice(product.price) : "—"}
                </TableCell>
                <TableCell>
                  <RowActionsMenu
                    editHref={`/admin/products/${product.id}/edit`}
                    deleteAction={deleteProductAction}
                    deleteHiddenFields={{ id: product.id }}
                    deleteTitle={`Archive "${product.name}"?`}
                    deleteDescription="It will disappear from the storefront immediately, but can be restored later."
                    deleteSuccessMessage="Product archived."
                  />
                </TableCell>
              </TableRow>
            ))}
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No products match this search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
