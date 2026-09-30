import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 1499.00).");
const optionalMoney = z.preprocess(emptyToUndefined, money.optional());
const optionalWeight = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,3})?$/, "Enter a valid weight in kg.")
    .optional(),
);

export const PRODUCT_STATUS_VALUES = ["draft", "active", "archived"] as const;

export const PRODUCT_STATUS_BADGE_VARIANT: Record<
  (typeof PRODUCT_STATUS_VALUES)[number],
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

export const productBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(300),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(300)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  sku: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(5000).optional()),
  shortDescription: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  brand: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  price: optionalMoney,
  compareAtPrice: optionalMoney,
  costPrice: optionalMoney,
  weight: optionalWeight,
  status: z.enum(PRODUCT_STATUS_VALUES),
  isFeatured: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  hasVariants: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  seoTitle: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  seoDescription: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  seoKeywords: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  categoryIds: z.array(z.uuid()).default([]),
  imageUrls: z.array(z.url()).default([]),
  initialStock: z.coerce.number().int().min(0).default(0),
  reorderPoint: z.coerce.number().int().min(0).default(0),
});

export type ProductBaseInput = z.infer<typeof productBaseSchema>;

export const variantRowSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid().optional()),
  sku: z.string().trim().min(1, "Every variant needs a SKU."),
  price: money,
  compareAtPrice: optionalMoney,
  costPrice: optionalMoney,
  weight: optionalWeight,
  status: z.enum(PRODUCT_STATUS_VALUES),
  attributeValueIds: z.array(z.uuid()).default([]),
  initialStock: z.coerce.number().int().min(0).default(0),
  reorderPoint: z.coerce.number().int().min(0).default(0),
});

export type VariantRowInput = z.infer<typeof variantRowSchema>;
