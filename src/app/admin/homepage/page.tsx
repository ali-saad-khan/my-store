import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeadingOnlySectionForm } from "@/modules/homepage/components/heading-only-section-form";
import { NewsletterSectionForm } from "@/modules/homepage/components/newsletter-section-form";
import { PromoSectionForm } from "@/modules/homepage/components/promo-section-form";
import { SectionVisibilityToggle } from "@/modules/homepage/components/section-visibility-toggle";
import { listHomepageSectionsForAdmin } from "@/modules/homepage/queries";
import {
  HOMEPAGE_SECTION_LABELS,
  headingOnlyContentSchema,
  newsletterContentSchema,
  promoContentSchema,
} from "@/validations/homepage";

export const metadata: Metadata = { title: "Homepage" };

export default async function AdminHomepagePage() {
  const sections = await listHomepageSectionsForAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Homepage"
        description="Show or hide sections, and edit their content. Changes appear on the live homepage immediately."
      />

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.key}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{HOMEPAGE_SECTION_LABELS[section.key]}</CardTitle>
              <SectionVisibilityToggle sectionKey={section.key} isVisible={section.isVisible} />
            </CardHeader>
            <CardContent>
              {section.key === "promo" && (
                <PromoSectionForm content={promoContentSchema.parse(section.content)} />
              )}
              {section.key === "newsletter" && (
                <NewsletterSectionForm content={newsletterContentSchema.parse(section.content)} />
              )}
              {section.key === "categories" && (
                <HeadingOnlySectionForm
                  sectionKey="categories"
                  content={headingOnlyContentSchema.parse(section.content)}
                  placeholder="Shop by Category"
                />
              )}
              {section.key === "featured_products" && (
                <HeadingOnlySectionForm
                  sectionKey="featured_products"
                  content={headingOnlyContentSchema.parse(section.content)}
                  placeholder="Featured"
                />
              )}
              {section.key === "hero" && (
                <p className="text-muted-foreground text-sm">
                  Hero content is managed via{" "}
                  <a href="/admin/banners" className="underline">
                    Banners
                  </a>
                  . This toggle controls whether the hero area shows at all.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
