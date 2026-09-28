import "server-only";
import { db } from "@/db/client";
import { isCouponValidationError, validateCoupon } from "@/modules/coupons/discount";
import type { getActiveCart } from "./queries";

type Cart = NonNullable<Awaited<ReturnType<typeof getActiveCart>>>;
type CartItem = Cart["items"][number];

function quantityAvailableFor(item: CartItem) {
  const inventoryRows = item.variant ? item.variant.inventory : item.product.inventory;
  return inventoryRows.reduce((sum, row) => sum + (row.quantityOnHand - row.quantityReserved), 0);
}

function variantLabelFor(item: CartItem) {
  if (!item.variant) return null;
  return item.variant.attributeValues.map(({ attributeValue }) => attributeValue.value).join(" / ");
}

export function toCartItemView(item: CartItem) {
  const quantityAvailable = quantityAvailableFor(item);
  const weight = Number((item.variant ?? item.product).weight ?? 0);

  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSlug: item.product.slug,
    imageUrl: item.product.images[0]?.url ?? null,
    variantId: item.variantId,
    variantLabel: variantLabelFor(item),
    sku: item.variant?.sku ?? item.product.sku,
    quantity: item.quantity,
    unitPrice: item.unitPriceSnapshot,
    lineTotal: (Number(item.unitPriceSnapshot) * item.quantity).toFixed(2),
    quantityAvailable,
    isAvailable: quantityAvailable > 0,
    weight,
  };
}

export type CartItemView = ReturnType<typeof toCartItemView>;

/**
 * Re-validates any applied coupon against the current cart contents on every
 * view (never trust a stale discount — MasterPlan.txt section 8). An
 * invalid/expired coupon isn't auto-removed; `couponError` lets the UI
 * explain why it no longer applies and offer to remove it.
 */
export async function toCartView(cart: Cart) {
  const items = cart.items.map(toCartItemView);
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);

  let coupon: { code: string; discountType: "percentage" | "fixed"; discountValue: string } | null =
    null;
  let discountAmount = 0;
  let couponError: string | null = null;

  if (cart.coupon) {
    coupon = {
      code: cart.coupon.code,
      discountType: cart.coupon.discountType,
      discountValue: cart.coupon.discountValue,
    };
    try {
      const result = await validateCoupon(db, {
        identifier: { code: cart.coupon.code },
        profileId: cart.profileId,
        lines: items.map((item) => ({
          key: item.id,
          productId: item.productId,
          lineSubtotal: Number(item.lineTotal),
        })),
      });
      discountAmount = result.discountAmount;
    } catch (error) {
      if (!isCouponValidationError(error)) throw error;
      couponError = error.message;
    }
  }

  return {
    id: cart.id,
    currencyCode: cart.currencyCode,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: subtotal.toFixed(2),
    totalWeightKg: items.reduce((sum, item) => sum + item.weight * item.quantity, 0),
    coupon,
    discountAmount: discountAmount.toFixed(2),
    couponError,
    total: (subtotal - discountAmount).toFixed(2),
  };
}

export type CartView = Awaited<ReturnType<typeof toCartView>>;
