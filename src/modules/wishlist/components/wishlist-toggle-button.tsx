"use client";

import { useActionState } from "react";
import { toggleWishlistAction, type WishlistActionState } from "@/modules/wishlist/actions";

export function WishlistToggleButton({
  productId,
  productSlug,
  initialInWishlist,
}: {
  productId: string;
  productSlug: string;
  initialInWishlist: boolean;
}) {
  const [state, formAction] = useActionState<WishlistActionState, FormData>(
    toggleWishlistAction,
    undefined,
  );

  // The server action revalidates this page, so the fresh `initialInWishlist` prop is the
  // source of truth after a round-trip; `state` only covers the brief gap before that refresh.
  const inWishlist = state?.success ? state.success.startsWith("Added") : initialInWishlist;

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="inWishlist" value={String(inWishlist)} />
      <button
        type="submit"
        className="border-border hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm"
      >
        {inWishlist ? "♥ Saved to wishlist" : "♡ Save to wishlist"}
      </button>
      {state?.error && <p className="text-destructive mt-1 text-sm">{state.error}</p>}
    </form>
  );
}
