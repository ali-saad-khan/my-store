import { z } from "zod";
import { reviewStatusEnum } from "@/db/schema";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const reviewInputSchema = z.object({
  productId: z.uuid(),
  productSlug: z.string().trim().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating.").max(5, "Pick a rating."),
  title: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  body: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const moderateReviewSchema = z.object({
  id: z.uuid(),
  status: z.enum(["approved", "rejected"]),
});

export const reviewListSearchSchema = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(reviewStatusEnum.enumValues).optional()),
  page: z.coerce.number().int().min(1).default(1),
});
