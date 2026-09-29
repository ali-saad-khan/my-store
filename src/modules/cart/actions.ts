"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/modules/auth/session";
import { track } from "@/modules/analytics/track";
import {
  addToCart,
  CartItemNotFoundError,
  OutOfStockError,
  ProductUnavailableError,
  removeCartItem,
  updateCartItemQuantity,
} from "./mutations";
import { addToCartSchema, removeCartItemSchema, updateCartItemSchema } from "@/validations/cart";

export type CartActionState = { error?: string; success?: string } | undefined;

function knownCartError(error: unknown) {
  return (
    error instanceof ProductUnavailableError ||
    error instanceof OutOfStockError ||
    error instanceof CartItemNotFoundError
  );
}

export async function addToCartAction(
  _prevState: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = addToCartSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? "Invalid input." };
  }

  try {
    await addToCart(parsed.data);
  } catch (error) {
    if (knownCartError(error)) return { error: (error as Error).message };
    throw error;
  }

  const user = await getCurrentUser();
  await track(
    "product_added_to_cart",
    {
      productId: parsed.data.productId,
      variantId: parsed.data.variantId,
      quantity: parsed.data.quantity,
    },
    { profileId: user?.id ?? null },
  );

  revalidatePath("/", "layout");
  return { success: "Added to cart." };
}

export async function updateCartItemAction(
  _prevState: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = updateCartItemSchema.safeParse({
    cartItemId: formData.get("cartItemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? "Invalid input." };
  }

  try {
    await updateCartItemQuantity(parsed.data);
  } catch (error) {
    if (knownCartError(error)) {
      revalidatePath("/", "layout");
      return { error: (error as Error).message };
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return { success: "Cart updated." };
}

export async function removeCartItemAction(
  _prevState: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const parsed = removeCartItemSchema.safeParse({ cartItemId: formData.get("cartItemId") });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }

  try {
    await removeCartItem(parsed.data.cartItemId);
  } catch (error) {
    if (knownCartError(error)) return { error: (error as Error).message };
    throw error;
  }

  revalidatePath("/", "layout");
  return { success: "Removed from cart." };
}
