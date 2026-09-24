import { z } from "zod";

export const DEFAULT_INVENTORY_PAGE_SIZE = 20;

/**
 * A blank <input> submits as "", and `FormData.get()` returns `null` for a
 * field that isn't present in the form at all (e.g. the inventory table's
 * adjustment form has no `note` input) — normalize both to undefined so
 * optional fields stay actually optional.
 */
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

/** Parses raw `searchParams` (always strings) from the admin inventory listing page. */
export const inventoryListSearchSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  lowStockOnly: z.preprocess(
    (value) => value === "on" || value === "true",
    z.boolean().default(false),
  ),
  page: z.coerce.number().int().min(1).default(1),
});

export type InventoryListSearch = z.infer<typeof inventoryListSearchSchema>;

/**
 * Movement types an admin can apply manually. `sale` is excluded — it's only
 * ever written by the checkout/order flow (Phase 6), never entered by hand.
 */
export const MANUAL_MOVEMENT_TYPES = [
  "purchase",
  "return",
  "adjustment",
  "damage",
  "cancellation",
] as const;

export const adjustInventorySchema = z.object({
  inventoryId: z.uuid(),
  type: z.enum(MANUAL_MOVEMENT_TYPES),
  quantity: z.coerce
    .number()
    .int()
    .refine((value) => value !== 0, "Quantity can't be zero."),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
