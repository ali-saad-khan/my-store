import { ProductCard, type ProductCardItem } from "./product-card";

export function ProductGrid({ products }: { products: ProductCardItem[] }) {
  if (products.length === 0) {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        No products match your search.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
