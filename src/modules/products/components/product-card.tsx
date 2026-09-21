import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/currency";

export type ProductCardItem = {
  slug: string;
  name: string;
  brand: string | null;
  displayPrice: string;
  compareAtPrice: string | null;
  imageUrl: string | null;
};

export function ProductCard({ product }: { product: ProductCardItem }) {
  const hasDiscount =
    product.compareAtPrice !== null &&
    Number(product.compareAtPrice) > Number(product.displayPrice);

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="mt-3 space-y-1">
        {product.brand && <p className="text-muted-foreground text-xs">{product.brand}</p>}
        <h3 className="text-foreground text-sm font-medium">{product.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{formatPrice(product.displayPrice)}</span>
          {hasDiscount && (
            <span className="text-muted-foreground text-xs line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
