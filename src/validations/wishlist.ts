import { z } from "zod";

export const toggleWishlistSchema = z.object({
  productId: z.uuid(),
  productSlug: z.string().trim().min(1),
  inWishlist: z.preprocess((value) => value === "true", z.boolean()),
});
