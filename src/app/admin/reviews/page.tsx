import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { ModerateReviewButtons } from "@/modules/reviews/components/moderate-review-buttons";
import { ReviewFilters } from "@/modules/reviews/components/review-filters";
import { listReviewsForAdmin } from "@/modules/reviews/queries";
import { REVIEW_STATUS_LABELS } from "@/modules/reviews/status";
import { reviewListSearchSchema } from "@/validations/review";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage(props: PageProps<"/admin/reviews">) {
  const rawSearch = await props.searchParams;
  const search = reviewListSearchSchema.parse(rawSearch);
  const result = await listReviewsForAdmin(search);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="text-muted-foreground text-sm">{result.total} total.</p>
      </div>

      <ReviewFilters status={search.status} />

      <div className="border-border divide-border divide-y rounded-lg border">
        {result.items.map((review) => (
          <div key={review.id} className="space-y-2 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/products/${review.product.slug}`} className="font-medium underline">
                  {review.product.name}
                </Link>
                <p className="text-muted-foreground">
                  {review.profile.email} · {review.rating} star{review.rating === 1 ? "" : "s"} ·{" "}
                  {REVIEW_STATUS_LABELS[review.status]}
                </p>
              </div>
              {review.status === "pending" && <ModerateReviewButtons reviewId={review.id} />}
            </div>
            {review.title && <p className="font-medium">{review.title}</p>}
            {review.body && <p className="text-muted-foreground">{review.body}</p>}
          </div>
        ))}
        {result.items.length === 0 && (
          <p className="text-muted-foreground px-4 py-8 text-center">
            No reviews match these filters.
          </p>
        )}
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => {
          const params = new URLSearchParams();
          if (search.status) params.set("status", search.status);
          params.set("page", String(page));
          return `/admin/reviews?${params.toString()}`;
        }}
      />
    </div>
  );
}
