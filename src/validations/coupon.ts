import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Code is required.")
      .max(50)
      .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only.")
      .transform((value) => value.toUpperCase()),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.coerce.number().positive("Discount value must be greater than 0."),
    minOrderValue: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
    maxDiscountAmount: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
    usageLimit: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
    perCustomerLimit: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
    startsAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    expiresAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
    isActive: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
    productIds: z.array(z.uuid()).default([]),
    categoryIds: z.array(z.uuid()).default([]),
  })
  .refine((data) => data.discountType !== "percentage" || data.discountValue <= 100, {
    message: "A percentage discount can't exceed 100.",
    path: ["discountValue"],
  })
  .refine((data) => !data.startsAt || !data.expiresAt || data.startsAt < data.expiresAt, {
    message: "Start date must be before expiry date.",
    path: ["expiresAt"],
  });

export type CouponInput = z.infer<typeof couponInputSchema>;

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code.").max(50),
});
