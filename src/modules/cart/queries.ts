import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { carts, cartItems, productVariants, products } from "@/db/schema";
import { getCurrentUser } from "@/modules/auth/session";
import { getCartSessionToken } from "./session";

/** `{ profileId }` when signed in, `{ sessionToken }` for a guest with an existing cart cookie, or `null`. */
export async function resolveCartOwner(): Promise<
  { profileId: string } | { sessionToken: string } | null
> {
  const user = await getCurrentUser();
  if (user) return { profileId: user.id };

  const sessionToken = await getCartSessionToken();
  return sessionToken ? { sessionToken } : null;
}

function ownerCondition(owner: { profileId: string } | { sessionToken: string }) {
  return "profileId" in owner
    ? eq(carts.profileId, owner.profileId)
    : eq(carts.sessionToken, owner.sessionToken);
}

export async function getActiveCart() {
  const owner = await resolveCartOwner();
  if (!owner) return null;

  return db.query.carts.findFirst({
    where: ownerCondition(owner),
    with: {
      items: {
        with: {
          product: {
            with: {
              images: { limit: 1, orderBy: (image, { asc }) => [asc(image.sortOrder)] },
              inventory: true,
            },
          },
          variant: {
            with: {
              product: true,
              inventory: true,
              attributeValues: { with: { attributeValue: { with: { attribute: true } } } },
            },
          },
        },
      },
    },
  });
}

/** Lightweight — used for the header's cart item count, rendered on every page. */
export async function getCartItemCount() {
  const owner = await resolveCartOwner();
  if (!owner) return 0;

  const [row] = await db
    .select({ count: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int` })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(ownerCondition(owner));

  return row?.count ?? 0;
}

export async function findCartItemWithOwnership(cartItemId: string) {
  const owner = await resolveCartOwner();
  if (!owner) return null;

  const item = await db.query.cartItems.findFirst({
    where: eq(cartItems.id, cartItemId),
    with: { cart: true },
  });

  if (!item) return null;
  if ("profileId" in owner && item.cart.profileId !== owner.profileId) return null;
  if ("sessionToken" in owner && item.cart.sessionToken !== owner.sessionToken) return null;

  return item;
}

/**
 * Live price + sellable stock for a product or variant, re-checked on every
 * cart mutation — never trust a client-supplied price (MasterPlan.txt
 * section 8). Returns `null` when the item can't be sold at all (missing,
 * archived, soft-deleted, or a variant that doesn't belong to the product).
 */
export async function getSellableItem(input: { productId: string; variantId?: string }) {
  if (input.variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, input.variantId),
        eq(productVariants.productId, input.productId),
        isNull(productVariants.deletedAt),
      ),
      with: { inventory: true },
    });
    if (!variant || variant.status !== "active") return null;

    return {
      price: variant.price,
      quantityAvailable: sumAvailable(variant.inventory),
    };
  }

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, input.productId), isNull(products.deletedAt)),
    with: { inventory: true },
  });
  if (!product || product.status !== "active" || product.hasVariants || !product.price) {
    return null;
  }

  return {
    price: product.price,
    quantityAvailable: sumAvailable(product.inventory),
  };
}

function sumAvailable(rows: { quantityOnHand: number; quantityReserved: number }[]) {
  return rows.reduce((sum, row) => sum + (row.quantityOnHand - row.quantityReserved), 0);
}
