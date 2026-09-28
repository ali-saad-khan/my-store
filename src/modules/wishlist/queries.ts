import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { wishlistItems, wishlists } from "@/db/schema";

/**
 * Wishlist is product-level only for now (MasterPlan's schema also allows a
 * variant-level entry, but nothing in the UI selects a variant ahead of the
 * product page, so plumbing that through would be premature — disclosed in
 * DATABASE.md).
 */
export async function isProductInWishlist(profileId: string, productId: string) {
  const [row] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .innerJoin(wishlists, eq(wishlists.id, wishlistItems.wishlistId))
    .where(
      and(
        eq(wishlists.profileId, profileId),
        eq(wishlistItems.productId, productId),
        isNull(wishlistItems.variantId),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function getWishlistForProfile(profileId: string) {
  const wishlist = await db.query.wishlists.findFirst({
    where: eq(wishlists.profileId, profileId),
    with: {
      items: {
        orderBy: (item, { desc }) => [desc(item.createdAt)],
        with: {
          product: {
            with: { images: { limit: 1, orderBy: (image, { asc }) => [asc(image.sortOrder)] } },
          },
        },
      },
    },
  });

  return wishlist?.items ?? [];
}
