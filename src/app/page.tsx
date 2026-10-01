import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroBannerSlider } from "@/components/hero-banner-slider";
import { NewsletterSignupForm } from "@/components/newsletter-signup-form";
import { getActiveBanners } from "@/modules/banners/queries";
import { absoluteUrl, buildOpenGraph, SITE_NAME } from "@/lib/seo";
import { getTopLevelCategories } from "@/modules/categories/queries";
import { getHomepageSections } from "@/modules/homepage/queries";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { getFeaturedProducts } from "@/modules/products/queries";
import { newsletterContentSchema, promoContentSchema } from "@/validations/homepage";

const DESCRIPTION = "Quality essentials, delivered across Pakistan.";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
  openGraph: buildOpenGraph({ title: SITE_NAME, description: DESCRIPTION, url: absoluteUrl("/") }),
};

export default async function Home() {
  const [featured, categories, banners, sections] = await Promise.all([
    getFeaturedProducts(8),
    getTopLevelCategories(),
    getActiveBanners(),
    getHomepageSections(),
  ]);

  const hero = sections.hero;
  const categoriesSection = sections.categories;
  const featuredSection = sections.featured_products;
  const promoSection = sections.promo;
  const newsletterSection = sections.newsletter;

  const promo = promoSection ? promoContentSchema.parse(promoSection.content) : null;
  const newsletter = newsletterSection
    ? newsletterContentSchema.parse(newsletterSection.content)
    : null;

  return (
    <div className="flex flex-col">
      {(hero?.isVisible ?? true) &&
        (banners.length > 0 ? (
          <div className="px-4 pt-6 sm:px-6 lg:px-12">
            <HeroBannerSlider slides={banners} />
          </div>
        ) : (
          <section className="bg-foreground text-background flex min-h-[420px] flex-col items-center justify-center gap-5 px-6 text-center">
            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              ESSENTIALS.
              <br />
              ELEVATED.
            </h1>
            <p className="max-w-md text-sm text-white/70 sm:text-base">{DESCRIPTION}</p>
            <Button
              size="lg"
              className="bg-background text-foreground rounded-full px-8 hover:opacity-90"
              nativeButton={false}
              render={<Link href="/products">Shop All Products</Link>}
            />
          </section>
        ))}

      <div className="mx-auto w-full max-w-6xl space-y-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-12">
        {(categoriesSection?.isVisible ?? true) && categories.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                {(categoriesSection?.content.heading as string) || "Shop by Category"}
              </h2>
              <Link href="/categories" className="text-sm font-semibold hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {categories.map((category) =>
                category.imageUrl ? (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="group relative aspect-[3/4] overflow-hidden rounded-xl"
                  >
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
                      <span className="text-[17px] font-bold text-white">{category.name}</span>
                    </div>
                  </Link>
                ) : (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="border-border hover:bg-muted flex aspect-[3/4] items-center justify-center rounded-xl border px-4 text-center text-sm font-semibold"
                  >
                    {category.name}
                  </Link>
                ),
              )}
            </div>
          </section>
        )}

        {(featuredSection?.isVisible ?? true) && featured.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                {(featuredSection?.content.heading as string) || "Featured"}
              </h2>
              <Link href="/products" className="text-sm font-semibold hover:underline">
                View all products →
              </Link>
            </div>
            <ProductGrid products={featured} />
          </section>
        )}

        {(promoSection?.isVisible ?? true) && promo && (
          <section className="relative overflow-hidden rounded-3xl bg-[#0A0A0A]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,color-mix(in_oklch,var(--brand-accent),transparent_82%),transparent_60%)]" />
            <div className="relative flex flex-col items-start gap-10 px-8 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-16 sm:py-20">
              <div className="max-w-lg space-y-4">
                {promo.eyebrow && (
                  <span className="text-brand-accent text-xs font-bold tracking-widest uppercase">
                    {promo.eyebrow}
                  </span>
                )}
                {promo.heading && (
                  <h2 className="text-3xl leading-tight font-black tracking-tight text-white sm:text-4xl">
                    {promo.heading}
                  </h2>
                )}
                {promo.subcopy && <p className="text-sm text-white/70">{promo.subcopy}</p>}
                {promo.ctaLabel && promo.ctaLink && (
                  <Link
                    href={promo.ctaLink}
                    className="bg-brand-accent text-brand-accent-foreground mt-2 inline-block rounded-full px-7 py-3 text-sm font-bold"
                  >
                    {promo.ctaLabel}
                  </Link>
                )}
              </div>
              {promo.imageUrl && (
                <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-2xl sm:h-64 sm:w-80">
                  <Image src={promo.imageUrl} alt="" fill sizes="320px" className="object-cover" />
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {(newsletterSection?.isVisible ?? true) && newsletter && (
        <section className="bg-[#F3F2EF] px-6 py-14 sm:px-12">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              {newsletter.heading && (
                <h3 className="text-xl font-extrabold sm:text-2xl">{newsletter.heading}</h3>
              )}
              {newsletter.subcopy && (
                <p className="text-muted-foreground max-w-sm text-sm">{newsletter.subcopy}</p>
              )}
            </div>
            <NewsletterSignupForm />
          </div>
        </section>
      )}
    </div>
  );
}
