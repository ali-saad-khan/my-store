import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_SORT_OPTIONS, type ProductListSearch } from "@/validations/catalog";

const SORT_LABELS: Record<(typeof PRODUCT_SORT_OPTIONS)[number], string> = {
  newest: "Newest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  name_asc: "Name: A to Z",
};

/** Plain GET form — works without client JS; the URL is the source of truth for filters. */
export function ProductFilters({ search }: { search: ProductListSearch }) {
  return (
    <form className="flex flex-wrap items-end gap-3" aria-label="Filter products">
      <div className="min-w-[10rem] flex-1 space-y-1.5">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          name="q"
          type="search"
          placeholder="Search products..."
          defaultValue={search.q}
        />
      </div>
      <div className="w-24 space-y-1.5">
        <Label htmlFor="minPrice">Min price</Label>
        <Input id="minPrice" name="minPrice" type="number" min={0} defaultValue={search.minPrice} />
      </div>
      <div className="w-24 space-y-1.5">
        <Label htmlFor="maxPrice">Max price</Label>
        <Input id="maxPrice" name="maxPrice" type="number" min={0} defaultValue={search.maxPrice} />
      </div>
      <div className="w-44 space-y-1.5">
        <Label htmlFor="sort">Sort by</Label>
        <select
          id="sort"
          name="sort"
          defaultValue={search.sort}
          className="border-border bg-background h-8 w-full rounded-lg border px-2.5 text-sm"
        >
          {PRODUCT_SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm">
        Apply
      </Button>
    </form>
  );
}
