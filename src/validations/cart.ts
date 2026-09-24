import { z } from "zod";

export const MAX_CART_ITEM_QUANTITY = 99;

/** A blank <input>/absent field submits as "" or null — keep optional fields optional. */
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const addToCartSchema = z.object({
  productId: z.uuid(),
  variantId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  quantity: z.coerce.number().int().min(1).max(MAX_CART_ITEM_QUANTITY).default(1),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

/** `quantity: 0` removes the item. */
export const updateCartItemSchema = z.object({
  cartItemId: z.uuid(),
  quantity: z.coerce.number().int().min(0).max(MAX_CART_ITEM_QUANTITY),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const removeCartItemSchema = z.object({
  cartItemId: z.uuid(),
});

export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
