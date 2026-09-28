export const SITE_NAME = "my-store";

/** The one place an absolute site URL is read from — canonical URLs, sitemap, OG images all go through this. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Next's Metadata merging replaces `openGraph`/`twitter` wholesale per segment rather than
 * deep-merging them with the root layout's defaults (confirmed live: a page-level
 * `openGraph` with no `siteName` silently dropped it from the rendered tags). Every page
 * that sets its own OG data should build it through this helper instead of a bare object
 * literal, so `siteName`/`type`/`locale` never go missing again.
 */
export function buildOpenGraph(og: {
  title?: string;
  description?: string;
  url: string;
  images?: string[];
}) {
  return {
    siteName: SITE_NAME,
    type: "website" as const,
    locale: "en_PK",
    title: og.title,
    description: og.description,
    url: og.url,
    images: og.images?.map((url) => ({ url })),
  };
}

export type BreadcrumbItem = { name: string; url: string };

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildProductJsonLd(params: {
  name: string;
  description?: string | null;
  slug: string;
  sku?: string | null;
  brand?: string | null;
  images: string[];
  price: { amount: string; currency: string } | { low: string; high: string; currency: string } | null;
  inStock: boolean;
  reviewSummary: { count: number; average: number | null };
}) {
  const url = absoluteUrl(`/products/${params.slug}`);
  const availability = params.inStock
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  const offers = !params.price
    ? undefined
    : "amount" in params.price
      ? {
          "@type": "Offer",
          url,
          priceCurrency: params.price.currency,
          price: params.price.amount,
          availability,
        }
      : {
          "@type": "AggregateOffer",
          url,
          priceCurrency: params.price.currency,
          lowPrice: params.price.low,
          highPrice: params.price.high,
          availability,
        };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: params.name,
    description: params.description ?? undefined,
    sku: params.sku ?? undefined,
    brand: params.brand ? { "@type": "Brand", name: params.brand } : undefined,
    image: params.images.length > 0 ? params.images : undefined,
    url,
    offers,
    aggregateRating:
      params.reviewSummary.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: params.reviewSummary.average,
            reviewCount: params.reviewSummary.count,
          }
        : undefined,
  };
}
