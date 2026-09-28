import { Button } from "@/components/ui/button";
import { REVIEW_STATUS_LABELS } from "@/modules/reviews/status";

export function ReviewFilters({ status }: { status?: string }) {
  return (
    <form className="flex flex-wrap items-end gap-3" aria-label="Filter reviews">
      <div className="w-52 space-y-1.5">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ""}
          className="border-border bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
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
