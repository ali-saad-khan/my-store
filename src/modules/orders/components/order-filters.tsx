import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORDER_STATUS_LABELS } from "@/modules/orders/status";

export function OrderFilters({ q, status }: { q?: string; status?: string }) {
  return (
    <form className="flex flex-wrap items-end gap-3" aria-label="Filter orders">
      <div className="min-w-[10rem] flex-1 space-y-1.5">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          name="q"
          type="search"
          placeholder="Order number or email..."
          defaultValue={q}
        />
      </div>
      <div className="w-52 space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ""}
          className="border-border bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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
