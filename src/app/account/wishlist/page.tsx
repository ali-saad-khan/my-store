import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/currency";
import { requireUser } from "@/modules/auth/session";
import { RemoveWishlistItemButton } from "@/modules/wishlist/components/remove-wishlist-item-button";
import { getWishlistForProfile } from "@/modules/wishlist/queries";

export const metadata: Metadata = { title: "Your wishlist" };

export default async function WishlistPage() {
  const user = await requireUser();
  const items = await getWishlistForProfile(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Your wishlist</h1>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          You haven&apos;t saved anything yet. Browse the{" "}
          <Link href="/products" className="underline">
            catalog
          </Link>{" "}
          and tap &quot;Save to wishlist&quot; on a product.
        </p>
      ) : (
        <div className="border-border divide-border divide-y rounded-lg border">
          {items.map((item) => {
            const image = item.product.images[0];
            return (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
                  {image && (
                    <Image
                      src={image.url}
                      alt={image.altText ?? item.product.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-medium underline"
                  >
                    {item.product.name}
                  </Link>
                  {item.product.price && (
                    <p className="text-muted-foreground text-sm">
                      {formatPrice(item.product.price)}
                    </p>
                  )}
                </div>
                <RemoveWishlistItemButton productId={item.productId} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
