import { describe, expect, it } from "vitest";
import { coupons, couponCategories, couponProducts, couponUsages } from "@/db/schema";
import { withRollback } from "../../../tests/helpers/db";
import {
  attachProductToCategory,
  createTestCategory,
  createTestOrderStub,
  createTestProduct,
  getAnyExistingProfileId,
} from "../../../tests/helpers/fixtures";
import {
  CouponMinOrderNotMetError,
  CouponNotApplicableError,
  CouponPerCustomerLimitReachedError,
  CouponUsageLimitReachedError,
  validateCoupon,
} from "./discount";

async function createTestCoupon(
  tx: Parameters<typeof validateCoupon>[0],
  overrides: Partial<typeof coupons.$inferInsert> = {},
) {
  const code = `TEST${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const [coupon] = await tx
    .insert(coupons)
    .values({
      code,
      discountType: "percentage",
      discountValue: "10.00",
      isActive: true,
      ...overrides,
    })
    .returning();
  return coupon;
}

describe("validateCoupon (integration, always rolled back)", () => {
  it("applies a percentage discount to an eligible line", async () => {
    await withRollback(async (tx) => {
      const { product } = await createTestProduct(tx);
      const coupon = await createTestCoupon(tx, { discountValue: "20.00" });

      const result = await validateCoupon(tx, {
        identifier: { code: coupon.code },
        profileId: null,
        lines: [{ key: "line-1", productId: product.id, lineSubtotal: 1000 }],
      });

      expect(result.discountAmount).toBe(200);
      expect(result.perLineDiscount.get("line-1")).toBe(200);
    });
  });

  it("rejects when the order is below the coupon's minimum order value", async () => {
    await withRollback(async (tx) => {
      const { product } = await createTestProduct(tx);
      const coupon = await createTestCoupon(tx, { minOrderValue: "5000.00" });

      await expect(
        validateCoupon(tx, {
          identifier: { code: coupon.code },
          profileId: null,
          lines: [{ key: "line-1", productId: product.id, lineSubtotal: 1000 }],
        }),
      ).rejects.toThrow(CouponMinOrderNotMetError);
    });
  });

  it("rejects once the total usage limit is reached", async () => {
    await withRollback(async (tx) => {
      const { product } = await createTestProduct(tx);
      const coupon = await createTestCoupon(tx, { usageLimit: 1 });
      // Simulate one prior redemption.
      const priorOrder = await createTestOrderStub(tx);
      await tx.insert(couponUsages).values({
        couponId: coupon.id,
        orderId: priorOrder.id,
        discountAmount: "10.00",
      });

      await expect(
        validateCoupon(tx, {
          identifier: { code: coupon.code },
          profileId: null,
          lines: [{ key: "line-1", productId: product.id, lineSubtotal: 1000 }],
        }),
      ).rejects.toThrow(CouponUsageLimitReachedError);
    });
  });

  it("rejects once a specific customer's per-customer limit is reached", async () => {
    await withRollback(async (tx) => {
      const { product } = await createTestProduct(tx);
      const coupon = await createTestCoupon(tx, { perCustomerLimit: 1 });
      const priorOrder = await createTestOrderStub(tx);
      const profileId = await getAnyExistingProfileId(tx);
      await tx.insert(couponUsages).values({
        couponId: coupon.id,
        orderId: priorOrder.id,
        profileId,
        discountAmount: "10.00",
      });

      await expect(
        validateCoupon(tx, {
          identifier: { code: coupon.code },
          profileId,
          lines: [{ key: "line-1", productId: product.id, lineSubtotal: 1000 }],
        }),
      ).rejects.toThrow(CouponPerCustomerLimitReachedError);
    });
  });

  it("rejects when restricted to a category the cart's product isn't in", async () => {
    await withRollback(async (tx) => {
      const { product } = await createTestProduct(tx);
      const restrictedCategory = await createTestCategory(tx);
      const coupon = await createTestCoupon(tx);
      await tx
        .insert(couponCategories)
        .values({ couponId: coupon.id, categoryId: restrictedCategory.id });

      await expect(
        validateCoupon(tx, {
          identifier: { code: coupon.code },
          profileId: null,
          lines: [{ key: "line-1", productId: product.id, lineSubtotal: 1000 }],
        }),
      ).rejects.toThrow(CouponNotApplicableError);
    });
  });

  it("applies when the cart's product IS in the restricted category", async () => {
    await withRollback(async (tx) => {
      const { product } = await createTestProduct(tx);
      const category = await createTestCategory(tx);
      await attachProductToCategory(tx, product.id, category.id);
      const coupon = await createTestCoupon(tx, { discountValue: "15.00" });
      await tx.insert(couponCategories).values({ couponId: coupon.id, categoryId: category.id });

      const result = await validateCoupon(tx, {
        identifier: { code: coupon.code },
        profileId: null,
        lines: [{ key: "line-1", productId: product.id, lineSubtotal: 1000 }],
      });
      expect(result.discountAmount).toBe(150);
    });
  });

  it("restricting to a specific product excludes an unrelated product in the cart", async () => {
    await withRollback(async (tx) => {
      const { product: restrictedProduct } = await createTestProduct(tx);
      const { product: otherProduct } = await createTestProduct(tx);
      const coupon = await createTestCoupon(tx);
      await tx
        .insert(couponProducts)
        .values({ couponId: coupon.id, productId: restrictedProduct.id });

      // Only the unrelated product is in the cart — nothing eligible.
      await expect(
        validateCoupon(tx, {
          identifier: { code: coupon.code },
          profileId: null,
          lines: [{ key: "line-1", productId: otherProduct.id, lineSubtotal: 1000 }],
        }),
      ).rejects.toThrow(CouponNotApplicableError);
    });
  });
});
