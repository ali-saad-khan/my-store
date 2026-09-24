import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InventoryListSearch } from "@/validations/inventory";

/** Plain GET form — works without client JS; the URL is the source of truth for filters. */
export function InventoryFilters({ search }: { search: InventoryListSearch }) {
  return (
    <form className="flex flex-wrap items-end gap-3" aria-label="Filter inventory">
      <div className="min-w-[10rem] flex-1 space-y-1.5">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          name="q"
          type="search"
          placeholder="Product name or SKU..."
          defaultValue={search.q}
        />
      </div>
      <label className="flex h-8 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="lowStockOnly"
          defaultChecked={search.lowStockOnly}
          className="size-4"
        />
        Low stock only
      </label>
      <Button type="submit" size="sm">
        Apply
      </Button>
    </form>
  );
}
