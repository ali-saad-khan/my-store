"use client";

import { useActionState } from "react";
import { moderateReviewAction, type ReviewActionState } from "@/modules/reviews/actions";

export function ModerateReviewButtons({ reviewId }: { reviewId: string }) {
  const [state, formAction] = useActionState<ReviewActionState, FormData>(
    moderateReviewAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex items-center gap-2 text-sm">
      <input type="hidden" name="id" value={reviewId} />
      <button
        type="submit"
        name="status"
        value="approved"
        className="text-primary hover:underline"
      >
        Approve
      </button>
      <button type="submit" name="status" value="rejected" className="text-destructive hover:underline">
        Reject
      </button>
      {state?.error && <span className="text-destructive">{state.error}</span>}
    </form>
  );
}
