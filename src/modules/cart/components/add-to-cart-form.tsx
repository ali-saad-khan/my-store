"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { addToCartAction } from "@/modules/cart/actions";

export function AddToCartForm({
  productId,
  variantId,
  disabled,
}: {
  productId: string;
  variantId?: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState(addToCartAction, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="productId" value={productId} />
      {variantId && <input type="hidden" name="variantId" value={variantId} />}
      <div className="flex items-center gap-2">
        <input
          type="number"
          name="quantity"
          defaultValue={1}
          min={1}
          max={99}
          aria-label="Quantity"
          disabled={disabled}
          className="border-border bg-background h-8 w-16 rounded-lg border px-2 text-sm disabled:opacity-50"
        />
        <SubmitButton disabled={disabled} pendingText="Adding..." className="w-auto">
          {disabled ? "Out of stock" : "Add to cart"}
        </SubmitButton>
      </div>
      <FormMessage error={state?.error} success={state?.success} />
    </form>
  );
}
