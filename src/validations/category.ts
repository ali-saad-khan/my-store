import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only."),
  parentId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  imageUrl: z.preprocess(emptyToUndefined, z.url().optional()),
  seoTitle: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  seoDescription: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  isActive: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  sortOrder: z.coerce.number().int().default(0),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
