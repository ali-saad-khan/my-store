"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import { AddToCartForm } from "@/modules/cart/components/add-to-cart-form";

export type AttributeGroup = {
  slug: string;
  name: string;
  values: { slug: string; value: string }[];
};

export type VariantOption = {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  quantityAvailable: number;
  attributes: Record<string, string>;
};

export function VariantSelector({
  productId,
  attributeGroups,
  variants,
}: {
  productId: string;
  attributeGroups: AttributeGroup[];
  variants: VariantOption[];
}) {
  const [selected, setSelected] = useState<Record<string, string>>(
    () => variants[0]?.attributes ?? {},
  );

  const activeVariant = variants.find((variant) =>
    attributeGroups.every((group) => variant.attributes[group.slug] === selected[group.slug]),
  );

  return (
    <div className="space-y-5">
      {attributeGroups.map((group) => (
        <div key={group.slug} className="space-y-2">
          <p className="text-sm font-medium">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const isSelected = selected[group.slug] === value.slug;
              return (
                <Button
                  key={value.slug}
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => setSelected((prev) => ({ ...prev, [group.slug]: value.slug }))}
                >
                  {value.value}
                </Button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="space-y-1">
        {activeVariant ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold">{formatPrice(activeVariant.price)}</span>
              {activeVariant.compareAtPrice &&
                Number(activeVariant.compareAtPrice) > Number(activeVariant.price) && (
                  <span className="text-muted-foreground text-sm line-through">
                    {formatPrice(activeVariant.compareAtPrice)}
                  </span>
                )}
            </div>
            <p className="text-muted-foreground text-sm">
              SKU: {activeVariant.sku} ·{" "}
              {activeVariant.quantityAvailable > 0 ? "In stock" : "Out of stock"}
            </p>
            <div className="pt-2">
              <AddToCartForm
                productId={productId}
                variantId={activeVariant.id}
                disabled={activeVariant.quantityAvailable <= 0}
              />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">This combination isn&apos;t available.</p>
        )}
      </div>
    </div>
  );
}
