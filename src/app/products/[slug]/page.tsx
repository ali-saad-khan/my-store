import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Pagination } from "@/components/pagination";
import { JsonLd } from "@/components/json-ld";
import { DEFAULT_MARKET } from "@/config/market";
import { formatPrice } from "@/lib/currency";
import { absoluteUrl, buildBreadcrumbJsonLd, buildOpenGraph, buildProductJsonLd } from "@/lib/seo";
import { track } from "@/modules/analytics/track";
import { AddToCartForm } from "@/modules/cart/components/add-to-cart-form";
import { getCurrentUser } from "@/modules/auth/session";
import { getProductBySlug } from "@/modules/products/queries";
import { VariantSelector } from "@/modules/products/components/variant-selector";
import { buildAttributeGroups, toVariantOptions } from "@/modules/products/variant-utils";
import { DeleteReviewButton } from "@/modules/reviews/components/delete-review-button";
import { ReviewForm } from "@/modules/reviews/components/review-form";
import {
  getOwnReviewForProduct,
  getReviewSummaryForProduct,
  listApprovedReviewsForProduct,
} from "@/modules/reviews/queries";
import { WishlistToggleButton } from "@/modules/wishlist/components/wishlist-toggle-button";
import { isProductInWishlist } from "@/modules/wishlist/queries";

const reviewsPageSearchSchema = z.object({
  reviewsPage: z.coerce.number().int().min(1).default(1),
});

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const title = product.seoTitle ?? product.name;
  const description = product.seoDescription ?? product.shortDescription ?? undefined;
  const url = absoluteUrl(`/products/${product.slug}`);
  const primaryImageUrl = product.images[0]?.url;

  return {
    title,
    description,
    keywords: product.seoKeywords ?? undefined,
    alternates: { canonical: url },
    openGraph: buildOpenGraph({
      title,
      description,
      url,
      images: primaryImageUrl ? [primaryImageUrl] : undefined,
    }),
    twitter: {
      title,
      description,
      images: primaryImageUrl ? [primaryImageUrl] : undefined,
    },
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const rawSearch = await props.searchParams;
  const { reviewsPage } = reviewsPageSearchSchema.parse(rawSearch);

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const user = await getCurrentUser();
  await track(
    "product_viewed",
    { productId: product.id, productSlug: product.slug, productName: product.name },
    { profileId: user?.id ?? null },
  );

  const primaryImage = product.images[0];
  const category = product.productCategories[0]?.category;

  const simpleStock = product.inventory.reduce(
    (sum, row) => sum + (row.quantityOnHand - row.quantityReserved),
    0,
  );

  const [reviewSummary, reviewsResult, ownReview, inWishlist] = await Promise.all([
    getReviewSummaryForProduct(product.id),
    listApprovedReviewsForProduct(product.id, reviewsPage),
    user ? getOwnReviewForProduct(user.id, product.id) : null,
    user ? isProductInWishlist(user.id, product.id) : false,
  ]);

  const activeVariants = product.variants.filter((variant) => variant.status === "active");
  const priceInfo = product.hasVariants
    ? (() => {
        if (activeVariants.length === 0) return null;
        const prices = activeVariants.map((variant) => Number(variant.price));
        const low = Math.min(...prices);
        const high = Math.max(...prices);
        return low === high
          ? { amount: low.toFixed(2), currency: DEFAULT_MARKET.currencyCode }
          : { low: low.toFixed(2), high: high.toFixed(2), currency: DEFAULT_MARKET.currencyCode };
      })()
    : product.price
      ? { amount: product.price, currency: DEFAULT_MARKET.currencyCode }
      : null;
  const inStock = product.hasVariants
    ? activeVariants.some(
        (variant) =>
          variant.inventory.reduce((sum, row) => sum + (row.quantityOnHand - row.quantityReserved), 0) >
          0,
      )
    : simpleStock > 0;

  const breadcrumbItems = [
    { name: "Home", url: absoluteUrl("/") },
    ...(category ? [{ name: category.name, url: absoluteUrl(`/categories/${category.slug}`) }] : []),
    { name: product.name, url: absoluteUrl(`/products/${product.slug}`) },
  ];

  const productJsonLd = buildProductJsonLd({
    name: product.name,
    description: product.seoDescription ?? product.description ?? product.shortDescription,
    slug: product.slug,
    sku: product.hasVariants ? null : product.sku,
    brand: product.brand,
    images: product.images.map((image) => image.url),
    price: priceInfo,
    inStock,
    reviewSummary,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <JsonLd data={productJsonLd} />
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbItems)} />
      {category && (
        <Link
          href={`/categories/${category.slug}`}
          className="text-muted-foreground text-sm underline"
        >
          {category.name}
        </Link>
      )}
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText ?? product.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          ) : null}
        </div>

        <div className="space-y-6">
          <div>
            {product.brand && <p className="text-muted-foreground text-sm">{product.brand}</p>}
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            {reviewSummary.count > 0 && (
              <p className="text-muted-foreground mt-1 text-sm">
                {"★".repeat(Math.round(reviewSummary.average ?? 0))}
                {"☆".repeat(5 - Math.round(reviewSummary.average ?? 0))}{" "}
                {reviewSummary.average?.toFixed(1)} ({reviewSummary.count} review
                {reviewSummary.count === 1 ? "" : "s"})
              </p>
            )}
          </div>

          {user && (
            <WishlistToggleButton
              productId={product.id}
              productSlug={product.slug}
              initialInWishlist={inWishlist}
            />
          )}

          {product.hasVariants ? (
            <VariantSelector
              productId={product.id}
              attributeGroups={buildAttributeGroups(product.variants)}
              variants={toVariantOptions(product.variants)}
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">{formatPrice(product.price ?? "0")}</span>
                {product.compareAtPrice &&
                  Number(product.compareAtPrice) > Number(product.price) && (
                    <span className="text-muted-foreground text-sm line-through">
                      {formatPrice(product.compareAtPrice)}
                    </span>
                  )}
              </div>
              <p className="text-muted-foreground text-sm">
                SKU: {product.sku} · {simpleStock > 0 ? "In stock" : "Out of stock"}
              </p>
              <div className="pt-2">
                <AddToCartForm productId={product.id} disabled={simpleStock <= 0} />
              </div>
            </div>
          )}

          {product.description && (
            <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
          )}
        </div>
      </div>

      <div className="mt-12 max-w-2xl space-y-6">
        <h2 className="text-xl font-semibold">Reviews</h2>

        {user ? (
          <div className="border-border space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-medium">
              {ownReview ? "Your review" : "Write a review"}
            </h3>
            <ReviewForm
              productId={product.id}
              productSlug={product.slug}
              existingReview={
                ownReview
                  ? { rating: ownReview.rating, title: ownReview.title, body: ownReview.body }
                  : undefined
              }
            />
            {ownReview && (
              <DeleteReviewButton reviewId={ownReview.id} productSlug={product.slug} />
            )}
            {ownReview && ownReview.status !== "approved" && (
              <p className="text-muted-foreground text-xs">
                Your review is {ownReview.status === "pending" ? "awaiting moderation" : "not shown publicly"} and
                only visible to you until approved.
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            <Link href="/login" className="underline">
              Sign in
            </Link>{" "}
            to write a review.
          </p>
        )}

        {reviewsResult.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviewsResult.items.map((review) => (
              <div key={review.id} className="border-border border-t pt-4 text-sm">
                <p className="font-medium">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                  {review.title && <span className="ml-2">{review.title}</span>}
                </p>
                {review.body && <p className="text-muted-foreground mt-1">{review.body}</p>}
                <p className="text-muted-foreground mt-1 text-xs">
                  {review.profile.fullName ?? "Verified customer"} ·{" "}
                  {new Date(review.createdAt).toLocaleDateString()}
                  {review.orderItemId && " · Verified purchase"}
                </p>
              </div>
            ))}
          </div>
        )}

        <Pagination
          page={reviewsResult.page}
          totalPages={reviewsResult.totalPages}
          buildHref={(page) => `/products/${product.slug}?reviewsPage=${page}`}
        />
      </div>
    </div>
  );
}
