import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/modules/products/components/product-grid-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-14 min-w-[10rem] flex-1" />
        <Skeleton className="h-14 w-24" />
        <Skeleton className="h-14 w-24" />
        <Skeleton className="h-14 w-44" />
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
