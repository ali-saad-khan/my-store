import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const bannerInputSchema = z.object({
  title: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  subtitle: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  ctaLabel: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
  ctaLink: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  isActive: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  sortOrder: z.coerce.number().int().default(0),
  imageUrl: z.preprocess(emptyToUndefined, z.url().optional()),
});

export type BannerInput = z.infer<typeof bannerInputSchema>;
