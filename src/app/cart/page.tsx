import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import { toCartView } from "@/modules/cart/cart-utils";
import { CartItemRow } from "@/modules/cart/components/cart-item-row";
import { getActiveCart } from "@/modules/cart/queries";
import { ApplyCouponForm } from "@/modules/coupons/components/apply-coupon-form";

export const metadata: Metadata = { title: "Your Cart", robots: { index: false, follow: false } };

export default async function CartPage() {
  const cart = await getActiveCart();
  const view = cart ? await toCartView(cart) : null;

  if (!view || view.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="text-muted-foreground">Browse the catalog to find something you like.</p>
        <Button nativeButton={false} render={<Link href="/products">Shop products</Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Your Cart</h1>

      <div className="border-border rounded-lg border px-4">
        {view.items.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>

      <ApplyCouponForm
        coupon={view.coupon}
        discountAmount={view.discountAmount}
        couponError={view.couponError}
      />

      <div className="flex items-center justify-between border-t pt-4">
        <div>
          <p className="text-muted-foreground text-sm">
            {view.itemCount} item{view.itemCount === 1 ? "" : "s"}
          </p>
          {Number(view.discountAmount) > 0 ? (
            <>
              <p className="text-muted-foreground text-sm line-through">
                {formatPrice(view.subtotal)}
              </p>
              <p className="text-lg font-semibold">Total: {formatPrice(view.total)}</p>
            </>
          ) : (
            <p className="text-lg font-semibold">Subtotal: {formatPrice(view.subtotal)}</p>
          )}
        </div>
        {view.items.some((item) => !item.isAvailable) ? (
          <Button size="lg" disabled title="Remove out-of-stock items to continue">
            Checkout
          </Button>
        ) : (
          <Button size="lg" nativeButton={false} render={<Link href="/checkout">Checkout</Link>} />
        )}
      </div>
    </div>
  );
}
