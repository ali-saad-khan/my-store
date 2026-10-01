import { z } from "zod";

export const HOMEPAGE_SECTION_KEYS = [
  "hero",
  "categories",
  "featured_products",
  "promo",
  "newsletter",
] as const;

export type HomepageSectionKey = (typeof HOMEPAGE_SECTION_KEYS)[number];

export const HOMEPAGE_SECTION_LABELS: Record<HomepageSectionKey, string> = {
  hero: "Hero banner",
  categories: "Shop by category",
  featured_products: "Featured products",
  promo: "Promo banner",
  newsletter: "Newsletter signup",
};

const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

/** `categories`/`featured_products` only expose a heading override — their actual content
 * (which categories/products) comes from real catalog data, not this table. */
export const headingOnlyContentSchema = z.object({
  heading: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
});

export const promoContentSchema = z.object({
  eyebrow: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  heading: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  subcopy: z.preprocess(emptyToUndefined, z.string().trim().max(240).optional()),
  ctaLabel: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  ctaLink: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  imageUrl: z.preprocess(emptyToUndefined, z.url().optional()),
});

export const newsletterContentSchema = z.object({
  heading: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  subcopy: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
});

export type PromoContent = z.infer<typeof promoContentSchema>;
export type NewsletterContent = z.infer<typeof newsletterContentSchema>;
export type HeadingOnlyContent = z.infer<typeof headingOnlyContentSchema>;
