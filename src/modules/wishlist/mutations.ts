import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { wishlistItems, wishlists } from "@/db/schema";

async function getOrCreateWishlistId(profileId: string): Promise<string> {
  const existing = await db.query.wishlists.findFirst({ where: eq(wishlists.profileId, profileId) });
  if (existing) return existing.id;

  const [created] = await db.insert(wishlists).values({ profileId }).returning();
  return created.id;
}

export async function addToWishlist(input: { profileId: string; productId: string }) {
  const wishlistId = await getOrCreateWishlistId(input.profileId);

  await db
    .insert(wishlistItems)
    .values({ wishlistId, productId: input.productId })
    .onConflictDoNothing({
      target: [wishlistItems.wishlistId, wishlistItems.productId],
      where: sql`${wishlistItems.variantId} IS NULL`,
    });
}

export async function removeFromWishlist(input: { profileId: string; productId: string }) {
  const wishlist = await db.query.wishlists.findFirst({
    where: eq(wishlists.profileId, input.profileId),
  });
  if (!wishlist) return;

  await db
    .delete(wishlistItems)
    .where(
      and(
        eq(wishlistItems.wishlistId, wishlist.id),
        eq(wishlistItems.productId, input.productId),
        isNull(wishlistItems.variantId),
      ),
    );
}
