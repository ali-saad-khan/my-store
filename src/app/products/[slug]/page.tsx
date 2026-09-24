import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/currency";
import { AddToCartForm } from "@/modules/cart/components/add-to-cart-form";
import { getProductBySlug } from "@/modules/products/queries";
import { VariantSelector } from "@/modules/products/components/variant-selector";
import { buildAttributeGroups, toVariantOptions } from "@/modules/products/variant-utils";

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const primaryImage = product.images[0];
  const category = product.productCategories[0]?.category;

  const simpleStock = product.inventory.reduce(
    (sum, row) => sum + (row.quantityOnHand - row.quantityReserved),
    0,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
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
          </div>

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
    </div>
  );
}
