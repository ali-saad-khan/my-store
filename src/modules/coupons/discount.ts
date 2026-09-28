import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { coupons, couponUsages, productCategories } from "@/db/schema";
import type { DbTransaction } from "@/modules/inventory/mutations";

export class CouponNotFoundError extends Error {
  constructor() {
    super("That coupon code doesn't exist.");
    this.name = "CouponNotFoundError";
  }
}

export class CouponInactiveError extends Error {
  constructor() {
    super("This coupon is no longer active.");
    this.name = "CouponInactiveError";
  }
}

export class CouponNotYetStartedError extends Error {
  constructor() {
    super("This coupon isn't active yet.");
    this.name = "CouponNotYetStartedError";
  }
}

export class CouponExpiredError extends Error {
  constructor() {
    super("This coupon has expired.");
    this.name = "CouponExpiredError";
  }
}

export class CouponMinOrderNotMetError extends Error {
  constructor(public minOrderValue: string) {
    super(`This coupon requires a minimum order value.`);
    this.name = "CouponMinOrderNotMetError";
  }
}

export class CouponUsageLimitReachedError extends Error {
  constructor() {
    super("This coupon has reached its usage limit.");
    this.name = "CouponUsageLimitReachedError";
  }
}

export class CouponPerCustomerLimitReachedError extends Error {
  constructor() {
    super("You've already used this coupon the maximum number of times.");
    this.name = "CouponPerCustomerLimitReachedError";
  }
}

export class CouponNotApplicableError extends Error {
  constructor() {
    super("This coupon doesn't apply to any items in your cart.");
    this.name = "CouponNotApplicableError";
  }
}

export type CouponLine = {
  /** Identity used to map the computed discount back onto a cart/order line. */
  key: string;
  productId: string;
  lineSubtotal: number;
};

/** Runs every user-facing coupon rejection through one place so callers can catch a single base type. */
export function isCouponValidationError(error: unknown): error is Error {
  return (
    error instanceof CouponNotFoundError ||
    error instanceof CouponInactiveError ||
    error instanceof CouponNotYetStartedError ||
    error instanceof CouponExpiredError ||
    error instanceof CouponMinOrderNotMetError ||
    error instanceof CouponUsageLimitReachedError ||
    error instanceof CouponPerCustomerLimitReachedError ||
    error instanceof CouponNotApplicableError
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

type CouponIdentifier = { code: string } | { couponId: string };

async function findCoupon(client: DbTransaction | typeof db, identifier: CouponIdentifier) {
  const where =
    "couponId" in identifier
      ? and(eq(coupons.id, identifier.couponId), isNull(coupons.deletedAt))
      : and(
          sql`upper(${coupons.code}) = ${identifier.code.trim().toUpperCase()}`,
          isNull(coupons.deletedAt),
        );

  return client.query.coupons.findFirst({ where, with: { products: true, categories: true } });
}

/**
 * Validates a coupon code against a set of cart/order lines and computes the
 * discount, distributed proportionally across the eligible lines. Never
 * trusts a previously-computed discount — call this again inside the
 * checkout transaction right before creating the order (MasterPlan.txt
 * section 8/10: never trust client-side prices/discounts).
 */
export async function validateCoupon(
  client: DbTransaction | typeof db,
  input: { identifier: CouponIdentifier; profileId: string | null; lines: CouponLine[] },
) {
  const coupon = await findCoupon(client, input.identifier);
  if (!coupon) throw new CouponNotFoundError();
  if (!coupon.isActive) throw new CouponInactiveError();

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw new CouponNotYetStartedError();
  if (coupon.expiresAt && coupon.expiresAt < now) throw new CouponExpiredError();

  const productRestrictions = new Set(coupon.products.map((p) => p.productId));
  const categoryRestrictions = new Set(coupon.categories.map((c) => c.categoryId));
  const hasRestrictions = productRestrictions.size > 0 || categoryRestrictions.size > 0;

  let eligibleLines = input.lines;
  if (hasRestrictions) {
    const categoryIdsByProduct = await getCategoryIdsForProducts(
      client,
      input.lines.map((l) => l.productId),
    );
    eligibleLines = input.lines.filter(
      (line) =>
        productRestrictions.has(line.productId) ||
        (categoryIdsByProduct.get(line.productId) ?? []).some((id) => categoryRestrictions.has(id)),
    );
  }
  if (eligibleLines.length === 0) throw new CouponNotApplicableError();

  const orderSubtotal = input.lines.reduce((sum, l) => sum + l.lineSubtotal, 0);
  if (coupon.minOrderValue && orderSubtotal < Number(coupon.minOrderValue)) {
    throw new CouponMinOrderNotMetError(coupon.minOrderValue);
  }

  if (coupon.usageLimit !== null) {
    const [row] = await client
      .select({ count: sql<number>`count(*)::int` })
      .from(couponUsages)
      .where(eq(couponUsages.couponId, coupon.id));
    if ((row?.count ?? 0) >= coupon.usageLimit) throw new CouponUsageLimitReachedError();
  }

  if (coupon.perCustomerLimit !== null && input.profileId) {
    const [row] = await client
      .select({ count: sql<number>`count(*)::int` })
      .from(couponUsages)
      .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.profileId, input.profileId)));
    if ((row?.count ?? 0) >= coupon.perCustomerLimit) throw new CouponPerCustomerLimitReachedError();
  }

  const eligibleSubtotal = eligibleLines.reduce((sum, l) => sum + l.lineSubtotal, 0);
  let discountAmount =
    coupon.discountType === "percentage"
      ? eligibleSubtotal * (Number(coupon.discountValue) / 100)
      : Number(coupon.discountValue);
  discountAmount = Math.min(discountAmount, eligibleSubtotal);
  if (coupon.maxDiscountAmount) {
    discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
  }
  discountAmount = round2(discountAmount);

  const perLineDiscount = new Map<string, number>();
  if (discountAmount > 0 && eligibleSubtotal > 0) {
    let allocated = 0;
    eligibleLines.forEach((line, index) => {
      const isLast = index === eligibleLines.length - 1;
      const amount = isLast
        ? round2(discountAmount - allocated)
        : round2(discountAmount * (line.lineSubtotal / eligibleSubtotal));
      allocated = round2(allocated + amount);
      perLineDiscount.set(line.key, amount);
    });
  }

  return { coupon, discountAmount, perLineDiscount };
}

async function getCategoryIdsForProducts(client: DbTransaction | typeof db, productIds: string[]) {
  if (productIds.length === 0) return new Map<string, string[]>();

  const rows = await client
    .select({ productId: productCategories.productId, categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(inArray(productCategories.productId, productIds));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    map.set(row.productId, [...(map.get(row.productId) ?? []), row.categoryId]);
  }
  return map;
}
