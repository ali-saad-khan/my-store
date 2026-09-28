"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { submitReviewAction, type ReviewActionState } from "@/modules/reviews/actions";

type ExistingReview = { rating: number; title: string | null; body: string | null };

export function ReviewForm({
  productId,
  productSlug,
  existingReview,
}: {
  productId: string;
  productSlug: string;
  existingReview?: ExistingReview;
}) {
  const [state, formAction] = useActionState<ReviewActionState, FormData>(
    submitReviewAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />
      <FormMessage error={state?.error} success={state?.success} />

      <div className="space-y-1.5">
        <Label htmlFor="rating">Rating</Label>
        <select
          id="rating"
          name="rating"
          defaultValue={existingReview?.rating ?? 5}
          className="border-border bg-background h-8 w-32 rounded-lg border px-2 text-sm"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title (optional)</Label>
        <input
          id="title"
          name="title"
          defaultValue={existingReview?.title ?? ""}
          maxLength={200}
          className="border-border bg-background h-8 w-full rounded-lg border px-2.5 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Review (optional)</Label>
        <textarea
          id="body"
          name="body"
          rows={3}
          defaultValue={existingReview?.body ?? ""}
          maxLength={2000}
          className="border-border bg-background w-full rounded-lg border px-2.5 py-1.5 text-sm"
        />
      </div>

      <SubmitButton pendingText="Submitting..." className="w-auto">
        {existingReview ? "Update review" : "Submit review"}
      </SubmitButton>
    </form>
  );
}
