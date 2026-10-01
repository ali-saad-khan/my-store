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
      <div className="bg-muted relative aspect-square overflow-hidden rounded-xl transition-shadow group-hover:shadow-lg">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {hasDiscount && (
          <span className="bg-brand-accent text-brand-accent-foreground absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase">
            Sale
          </span>
        )}
      </div>
      <div className="mt-3.5 space-y-1">
        {product.brand && (
          <p className="text-muted-foreground text-xs font-semibold">{product.brand}</p>
        )}
        <h3 className="text-foreground text-[15px] font-semibold group-hover:underline">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold">{formatPrice(product.displayPrice)}</span>
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
