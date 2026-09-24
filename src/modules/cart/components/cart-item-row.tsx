"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { formatPrice } from "@/lib/currency";
import { removeCartItemAction, updateCartItemAction } from "@/modules/cart/actions";
import type { CartItemView } from "@/modules/cart/cart-utils";

export function CartItemRow({ item }: { item: CartItemView }) {
  const [updateState, updateAction] = useActionState(updateCartItemAction, undefined);
  const [removeState, removeAction] = useActionState(removeCartItemAction, undefined);

  return (
    <div className="flex gap-4 border-b py-4 last:border-b-0">
      <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            fill
            sizes="80px"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex-1 space-y-1">
        <Link href={`/products/${item.productSlug}`} className="font-medium hover:underline">
          {item.productName}
        </Link>
        {item.variantLabel && <p className="text-muted-foreground text-sm">{item.variantLabel}</p>}
        <p className="text-muted-foreground text-sm">SKU: {item.sku}</p>
        {!item.isAvailable && <p className="text-destructive text-sm font-medium">Out of stock</p>}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <form action={updateAction} className="flex items-center gap-1.5">
            <input type="hidden" name="cartItemId" value={item.id} />
            <input
              type="number"
              name="quantity"
              defaultValue={item.quantity}
              min={0}
              max={Math.max(item.quantityAvailable, item.quantity)}
              aria-label="Quantity"
              className="border-border bg-background h-8 w-16 rounded-lg border px-2 text-sm"
            />
            <SubmitButton size="sm" className="w-auto" pendingText="Updating...">
              Update
            </SubmitButton>
          </form>

          <form action={removeAction}>
            <input type="hidden" name="cartItemId" value={item.id} />
            <SubmitButton
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive w-auto"
              pendingText="Removing..."
            >
              Remove
            </SubmitButton>
          </form>
        </div>

        <FormMessage error={updateState?.error} success={updateState?.success} />
        <FormMessage error={removeState?.error} success={removeState?.success} />
      </div>

      <div className="text-right">
        <p className="font-medium">{formatPrice(item.lineTotal)}</p>
        <p className="text-muted-foreground text-sm">{formatPrice(item.unitPrice)} each</p>
      </div>
    </div>
  );
}
