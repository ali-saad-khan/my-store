"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getCurrentUser, requireAdmin } from "@/modules/auth/session";
import { getActiveCart, resolveCartOwner } from "@/modules/cart/queries";
import { applyCouponSchema, couponInputSchema } from "@/validations/coupon";
import { isCouponValidationError, validateCoupon, type CouponLine } from "./discount";
import {
  clearCartCoupon,
  createCoupon,
  DuplicateCouponCodeError,
  setCartCoupon,
  softDeleteCoupon,
  updateCoupon,
} from "./mutations";

export type CouponActionState = { error?: string; success?: string } | undefined;

function cartLines(cart: NonNullable<Awaited<ReturnType<typeof getActiveCart>>>): CouponLine[] {
  return cart.items.map((item) => ({
    key: item.id,
    productId: item.productId,
    lineSubtotal: Number(item.unitPriceSnapshot) * item.quantity,
  }));
}

export async function applyCouponAction(
  _prevState: CouponActionState,
  formData: FormData,
): Promise<CouponActionState> {
  const owner = await resolveCartOwner();
  if (!owner) return { error: "Your cart is empty." };

  // Coupon codes are guessable — cap attempts per IP so this can't be brute-forced.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit({
    key: `coupon_apply:${ip}`,
    limit: 10,
    windowSeconds: 5 * 60,
  });
  if (!allowed) return { error: "Too many attempts. Try again in a few minutes." };

  const parsed = applyCouponSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const cart = await getActiveCart();
  if (!cart || cart.items.length === 0) return { error: "Your cart is empty." };

  const user = await getCurrentUser();

  try {
    const { coupon } = await validateCoupon(db, {
      identifier: { code: parsed.data.code },
      profileId: user?.id ?? null,
      lines: cartLines(cart),
    });
    await setCartCoupon(cart.id, coupon.id);
  } catch (error) {
    if (isCouponValidationError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: "Coupon applied." };
}

export async function removeCouponAction() {
  const cart = await getActiveCart();
  if (cart) await clearCartCoupon(cart.id);

  revalidatePath("/cart");
  revalidatePath("/checkout");
}

function parseCouponForm(formData: FormData) {
  return couponInputSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    minOrderValue: formData.get("minOrderValue"),
    maxDiscountAmount: formData.get("maxDiscountAmount"),
    usageLimit: formData.get("usageLimit"),
    perCustomerLimit: formData.get("perCustomerLimit"),
    startsAt: formData.get("startsAt"),
    expiresAt: formData.get("expiresAt"),
    isActive: formData.get("isActive"),
    productIds: formData.getAll("productIds"),
    categoryIds: formData.getAll("categoryIds"),
  });
}

export async function createCouponAction(
  _prevState: CouponActionState,
  formData: FormData,
): Promise<CouponActionState> {
  await requireAdmin();
  const parsed = parseCouponForm(formData);
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createCoupon(parsed.data);
  } catch (error) {
    if (error instanceof DuplicateCouponCodeError) return { error: error.message };
    throw error;
  }

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

export async function updateCouponAction(
  _prevState: CouponActionState,
  formData: FormData,
): Promise<CouponActionState> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Invalid coupon." };

  const parsed = parseCouponForm(formData);
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateCoupon(id, parsed.data);
  } catch (error) {
    if (error instanceof DuplicateCouponCodeError) return { error: error.message };
    throw error;
  }

  revalidatePath("/admin/coupons");
  redirect("/admin/coupons");
}

export async function deleteCouponAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await softDeleteCoupon(id);
  revalidatePath("/admin/coupons");
}
