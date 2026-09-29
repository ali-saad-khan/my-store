import { Skeleton } from "@/components/ui/skeleton";

/** Generic fallback for any route without its own loading.tsx (see route-level ones for
 * pages worth a tailored skeleton). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
    </div>
  );
}
