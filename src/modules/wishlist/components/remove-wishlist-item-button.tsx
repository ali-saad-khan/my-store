"use client";

import { removeFromWishlistAction } from "@/modules/wishlist/actions";

export function RemoveWishlistItemButton({ productId }: { productId: string }) {
  return (
    <form action={removeFromWishlistAction}>
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" className="text-destructive text-sm hover:underline">
        Remove
      </button>
    </form>
  );
}
