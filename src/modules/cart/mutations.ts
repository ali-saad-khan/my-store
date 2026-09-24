import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { carts, cartItems } from "@/db/schema";
import { DEFAULT_MARKET } from "@/config/market";
import { getCurrentUser } from "@/modules/auth/session";
import { MAX_CART_ITEM_QUANTITY } from "@/validations/cart";
import { findCartItemWithOwnership, getSellableItem } from "./queries";
import { getOrCreateCartSessionToken } from "./session";

export class ProductUnavailableError extends Error {
  constructor() {
    super("This product is no longer available.");
    this.name = "ProductUnavailableError";
  }
}

export class OutOfStockError extends Error {
  constructor() {
    super("This item is out of stock.");
    this.name = "OutOfStockError";
  }
}

export class CartItemNotFoundError extends Error {
  constructor() {
    super("Cart item not found.");
    this.name = "CartItemNotFoundError";
  }
}

async function getOrCreateCartId(): Promise<string> {
  const user = await getCurrentUser();
  const owner = user
    ? { column: carts.profileId, value: user.id }
    : { column: carts.sessionToken, value: await getOrCreateCartSessionToken() };

  const existing = await db.query.carts.findFirst({ where: eq(owner.column, owner.value) });
  if (existing) return existing.id;

  const [created] = await db
    .insert(carts)
    .values({
      profileId: user?.id,
      sessionToken: user ? undefined : owner.value,
      currencyCode: DEFAULT_MARKET.currencyCode,
    })
    .returning();

  return created.id;
}

/**
 * Adds a product/variant to the cart, or increases quantity if it's already
 * there. Uses a single atomic upsert (backed by the partial unique indexes
 * on `cart_items`) rather than check-then-write, so two concurrent
 * "Add to cart" clicks can't create duplicate rows or double-add. The
 * combined quantity is always capped at live sellable stock.
 */
export async function addToCart(input: {
  productId: string;
  variantId?: string;
  quantity: number;
}) {
  const sellable = await getSellableItem(input);
  if (!sellable) throw new ProductUnavailableError();
  if (sellable.quantityAvailable <= 0) throw new OutOfStockError();

  const cartId = await getOrCreateCartId();
  const requestedQuantity = Math.min(
    input.quantity,
    MAX_CART_ITEM_QUANTITY,
    sellable.quantityAvailable,
  );

  const [item] = await db
    .insert(cartItems)
    .values({
      cartId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      quantity: requestedQuantity,
      unitPriceSnapshot: sellable.price,
    })
    .onConflictDoUpdate({
      target: input.variantId
        ? [cartItems.cartId, cartItems.variantId]
        : [cartItems.cartId, cartItems.productId],
      targetWhere: input.variantId
        ? sql`${cartItems.variantId} IS NOT NULL`
        : sql`${cartItems.variantId} IS NULL`,
      set: {
        quantity: sql`least(${cartItems.quantity} + excluded.quantity, ${sellable.quantityAvailable})`,
        unitPriceSnapshot: sellable.price,
        updatedAt: new Date(),
      },
    })
    .returning();

  return item;
}

/** `quantity: 0` removes the item. Re-validates live stock and caps accordingly. */
export async function updateCartItemQuantity(input: { cartItemId: string; quantity: number }) {
  const item = await findCartItemWithOwnership(input.cartItemId);
  if (!item) throw new CartItemNotFoundError();

  if (input.quantity === 0) {
    await db.delete(cartItems).where(eq(cartItems.id, item.id));
    return null;
  }

  const sellable = await getSellableItem({
    productId: item.productId,
    variantId: item.variantId ?? undefined,
  });

  if (!sellable || sellable.quantityAvailable <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, item.id));
    throw new OutOfStockError();
  }

  const quantity = Math.min(input.quantity, MAX_CART_ITEM_QUANTITY, sellable.quantityAvailable);

  const [updated] = await db
    .update(cartItems)
    .set({ quantity, unitPriceSnapshot: sellable.price, updatedAt: new Date() })
    .where(eq(cartItems.id, item.id))
    .returning();

  return updated;
}

export async function removeCartItem(cartItemId: string) {
  const item = await findCartItemWithOwnership(cartItemId);
  if (!item) throw new CartItemNotFoundError();

  await db.delete(cartItems).where(eq(cartItems.id, item.id));
}

/**
 * Folds a guest cart into the signed-in profile's cart on login/signup —
 * matching items sum quantities (capped at live stock), everything else
 * moves over as-is. Always call `clearCartSessionCookie()` afterward.
 */
export async function mergeGuestCartIntoProfile(input: {
  profileId: string;
  sessionToken: string;
}) {
  await db.transaction(async (tx) => {
    const guestCart = await tx.query.carts.findFirst({
      where: eq(carts.sessionToken, input.sessionToken),
      with: { items: true },
    });
    if (!guestCart || guestCart.items.length === 0) {
      if (guestCart) await tx.delete(carts).where(eq(carts.id, guestCart.id));
      return;
    }

    let profileCart = await tx.query.carts.findFirst({
      where: eq(carts.profileId, input.profileId),
    });
    profileCart ??= (
      await tx
        .insert(carts)
        .values({ profileId: input.profileId, currencyCode: DEFAULT_MARKET.currencyCode })
        .returning()
    )[0];

    for (const guestItem of guestCart.items) {
      const sellable = await getSellableItem({
        productId: guestItem.productId,
        variantId: guestItem.variantId ?? undefined,
      });
      if (!sellable || sellable.quantityAvailable <= 0) continue;

      const quantity = Math.min(
        guestItem.quantity,
        MAX_CART_ITEM_QUANTITY,
        sellable.quantityAvailable,
      );

      await tx
        .insert(cartItems)
        .values({
          cartId: profileCart.id,
          productId: guestItem.productId,
          variantId: guestItem.variantId,
          quantity,
          unitPriceSnapshot: sellable.price,
        })
        .onConflictDoUpdate({
          target: guestItem.variantId
            ? [cartItems.cartId, cartItems.variantId]
            : [cartItems.cartId, cartItems.productId],
          targetWhere: guestItem.variantId
            ? sql`${cartItems.variantId} IS NOT NULL`
            : sql`${cartItems.variantId} IS NULL`,
          set: {
            quantity: sql`least(${cartItems.quantity} + excluded.quantity, ${sellable.quantityAvailable})`,
            unitPriceSnapshot: sellable.price,
            updatedAt: new Date(),
          },
        });
    }

    await tx.delete(carts).where(eq(carts.id, guestCart.id));
  });
}
