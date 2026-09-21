import { z } from "zod";

export const PRODUCT_SORT_OPTIONS = ["newest", "price_asc", "price_desc", "name_asc"] as const;
export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE = 12;

/**
 * A blank <input> submits as `""`, and `z.coerce.number()` turns `""` into `0`
 * (`Number("") === 0`) rather than failing — so an untouched optional numeric
 * field would otherwise be coerced to a real 0 instead of staying unset.
 */
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalNonNegativeNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().nonnegative().optional(),
);

/** Parses raw `searchParams` (always strings) from a product/category listing page. */
export const productListSearchSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  minPrice: optionalNonNegativeNumber,
  maxPrice: optionalNonNegativeNumber,
  sort: z.enum(PRODUCT_SORT_OPTIONS).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
});

export type ProductListSearch = z.infer<typeof productListSearchSchema>;
