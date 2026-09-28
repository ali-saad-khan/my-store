"use client";

import { deleteReviewAction } from "@/modules/reviews/actions";

export function DeleteReviewButton({
  reviewId,
  productSlug,
}: {
  reviewId: string;
  productSlug: string;
}) {
  return (
    <form
      action={deleteReviewAction}
      onSubmit={(event) => {
        if (!confirm("Delete your review?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={reviewId} />
      <input type="hidden" name="productSlug" value={productSlug} />
      <button type="submit" className="text-destructive text-sm hover:underline">
        Delete review
      </button>
    </form>
  );
}
