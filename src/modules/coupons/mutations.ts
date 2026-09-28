import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { carts, couponCategories, couponProducts, coupons } from "@/db/schema";
import type { CouponInput } from "@/validations/coupon";

export class CouponAdminNotFoundError extends Error {
  constructor() {
    super("Coupon not found.");
    this.name = "CouponAdminNotFoundError";
  }
}

export class DuplicateCouponCodeError extends Error {
  constructor() {
    super("A coupon with that code already exists.");
    this.name = "DuplicateCouponCodeError";
  }
}

function couponRow(input: CouponInput) {
  return {
    code: input.code,
    description: input.description,
    discountType: input.discountType,
    discountValue: input.discountValue.toFixed(2),
    minOrderValue: input.minOrderValue?.toFixed(2),
    maxDiscountAmount: input.maxDiscountAmount?.toFixed(2),
    usageLimit: input.usageLimit,
    perCustomerLimit: input.perCustomerLimit,
    startsAt: input.startsAt,
    expiresAt: input.expiresAt,
    isActive: input.isActive,
  };
}

export async function createCoupon(input: CouponInput) {
  try {
    return await db.transaction(async (tx) => {
      const [coupon] = await tx.insert(coupons).values(couponRow(input)).returning();
      await syncRestrictions(tx, coupon.id, input);
      return coupon;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateCouponCodeError();
    throw error;
  }
}

export async function updateCoupon(id: string, input: CouponInput) {
  try {
    return await db.transaction(async (tx) => {
      const [coupon] = await tx
        .update(coupons)
        .set({ ...couponRow(input), updatedAt: new Date() })
        .where(eq(coupons.id, id))
        .returning();
      if (!coupon) throw new CouponAdminNotFoundError();
      await syncRestrictions(tx, id, input);
      return coupon;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateCouponCodeError();
    throw error;
  }
}

async function syncRestrictions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  couponId: string,
  input: CouponInput,
) {
  await tx.delete(couponProducts).where(eq(couponProducts.couponId, couponId));
  await tx.delete(couponCategories).where(eq(couponCategories.couponId, couponId));

  if (input.productIds.length > 0) {
    await tx
      .insert(couponProducts)
      .values(input.productIds.map((productId) => ({ couponId, productId })));
  }
  if (input.categoryIds.length > 0) {
    await tx
      .insert(couponCategories)
      .values(input.categoryIds.map((categoryId) => ({ couponId, categoryId })));
  }
}

export async function softDeleteCoupon(id: string) {
  const [coupon] = await db
    .update(coupons)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(coupons.id, id))
    .returning();
  if (!coupon) throw new CouponAdminNotFoundError();
  return coupon;
}

export async function setCartCoupon(cartId: string, couponId: string) {
  await db.update(carts).set({ couponId, updatedAt: new Date() }).where(eq(carts.id, cartId));
}

export async function clearCartCoupon(cartId: string) {
  await db
    .update(carts)
    .set({ couponId: null, updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
