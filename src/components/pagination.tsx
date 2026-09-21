import Link from "next/link";
import { Button } from "@/components/ui/button";

/** URL-driven pagination — no client JS required. Reused across products/orders/etc. */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={buildHref(page - 1)}>Previous</Link>}
        />
      ) : (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      )}
      <span className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={buildHref(page + 1)}>Next</Link>}
        />
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </nav>
  );
}
