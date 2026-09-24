import type { Metadata } from "next";
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <p className="text-muted-foreground text-sm">
          {result.total} tracked item{result.total === 1 ? "" : "s"}. Adjustments are recorded as
          movements and applied transactionally.
        </p>
      </div>

      <InventoryFilters search={search} />

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 text-right font-medium">On hand</th>
              <th className="px-3 py-2 text-right font-medium">Reserved</th>
              <th className="px-3 py-2 text-right font-medium">Available</th>
              <th className="px-3 py-2 text-right font-medium">Reorder pt</th>
              <th className="px-3 py-2 font-medium">Adjust stock</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {result.items.map((item) => (
              <tr key={item.id} className={item.isLowStock ? "bg-destructive/5" : undefined}>
                <td className="px-3 py-2">
                  <div className="font-medium">{item.productName}</div>
                  {item.variantLabel && (
                    <div className="text-muted-foreground text-xs">{item.variantLabel}</div>
                  )}
                  {item.isLowStock && (
                    <span className="text-destructive text-xs font-medium">Low stock</span>
                  )}
                </td>
                <td className="text-muted-foreground px-3 py-2">{item.sku}</td>
                <td className="px-3 py-2 text-right tabular-nums">{item.quantityOnHand}</td>
                <td className="px-3 py-2 text-right tabular-nums">{item.quantityReserved}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {item.quantityAvailable}
                </td>
                <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                  {item.reorderPoint}
                </td>
                <td className="px-3 py-2">
                  <AdjustInventoryForm inventoryId={item.id} />
                </td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-3 py-8 text-center">
                  No inventory records match these filters.
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
          if (search.lowStockOnly) params.set("lowStockOnly", "on");
          params.set("page", String(page));
          return `/admin/inventory?${params.toString()}`;
        }}
      />
    </div>
  );
}
