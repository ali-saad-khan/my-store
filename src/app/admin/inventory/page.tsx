import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { AdjustInventoryForm } from "@/modules/inventory/components/adjust-inventory-form";
import { InventoryFilters } from "@/modules/inventory/components/inventory-filters";
import { listInventory } from "@/modules/inventory/queries";
import { inventoryListSearchSchema } from "@/validations/inventory";

export const metadata: Metadata = { title: "Inventory" };

export default async function AdminInventoryPage(props: PageProps<"/admin/inventory">) {
  const rawSearch = await props.searchParams;
  const search = inventoryListSearchSchema.parse(rawSearch);
  const result = await listInventory(search);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Inventory"
        description={`${result.total} tracked item${result.total === 1 ? "" : "s"}. Adjustments are recorded as movements and applied transactionally.`}
      />

      <InventoryFilters search={search} />

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Reorder pt</TableHead>
              <TableHead>Adjust stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((item) => (
              <TableRow key={item.id} className={item.isLowStock ? "bg-destructive/5" : undefined}>
                <TableCell>
                  <div className="font-medium">{item.productName}</div>
                  {item.variantLabel && (
                    <div className="text-muted-foreground text-xs">{item.variantLabel}</div>
                  )}
                  {item.isLowStock && (
                    <Badge variant="destructive" className="mt-1">
                      Low stock
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantityOnHand}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantityReserved}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {item.quantityAvailable}
                </TableCell>
                <TableCell className="text-muted-foreground text-right tabular-nums">
                  {item.reorderPoint}
                </TableCell>
                <TableCell>
                  <AdjustInventoryForm inventoryId={item.id} />
                </TableCell>
              </TableRow>
            ))}
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  No inventory records match these filters.
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
          if (search.lowStockOnly) params.set("lowStockOnly", "on");
          params.set("page", String(page));
          return `/admin/inventory?${params.toString()}`;
        }}
      />
    </div>
  );
}
