"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/modules/auth/session";
import { track } from "@/modules/analytics/track";
import { toggleWishlistSchema } from "@/validations/wishlist";
import { addToWishlist, removeFromWishlist } from "./mutations";

export type WishlistActionState = { error?: string; success?: string } | undefined;

export async function toggleWishlistAction(
  _prevState: WishlistActionState,
  formData: FormData,
): Promise<WishlistActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to save items to your wishlist." };

  const parsed = toggleWishlistSchema.safeParse({
    productId: formData.get("productId"),
    productSlug: formData.get("productSlug"),
    inWishlist: formData.get("inWishlist"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  if (parsed.data.inWishlist) {
    await removeFromWishlist({ profileId: user.id, productId: parsed.data.productId });
  } else {
    await addToWishlist({ profileId: user.id, productId: parsed.data.productId });
    await track(
      "wishlist_added",
      { productId: parsed.data.productId },
      { profileId: user.id },
    );
  }

  revalidatePath(`/products/${parsed.data.productSlug}`);
  revalidatePath("/account/wishlist");
  return { success: parsed.data.inWishlist ? "Removed from wishlist." : "Added to wishlist." };
}

export async function removeFromWishlistAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const productId = formData.get("productId");
  if (typeof productId !== "string" || !productId) return;

  await removeFromWishlist({ profileId: user.id, productId });
  revalidatePath("/account/wishlist");
}
