import type { getProductBySlug } from "./queries";
import type { AttributeGroup, VariantOption } from "./components/variant-selector";

type Product = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;
type Variant = Product["variants"][number];

export function buildAttributeGroups(variants: Variant[]): AttributeGroup[] {
  const groups = new Map<string, AttributeGroup>();

  for (const variant of variants) {
    for (const { attributeValue } of variant.attributeValues) {
      const { attribute } = attributeValue;
      const group = groups.get(attribute.slug) ?? {
        slug: attribute.slug,
        name: attribute.name,
        values: [],
      };
      if (!group.values.some((value) => value.slug === attributeValue.slug)) {
        group.values.push({ slug: attributeValue.slug, value: attributeValue.value });
      }
      groups.set(attribute.slug, group);
    }
  }

  return Array.from(groups.values());
}

export function toVariantOptions(variants: Variant[]): VariantOption[] {
  return variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    quantityAvailable: variant.inventory.reduce(
      (sum, row) => sum + (row.quantityOnHand - row.quantityReserved),
      0,
    ),
    attributes: Object.fromEntries(
      variant.attributeValues.map(({ attributeValue }) => [
        attributeValue.attribute.slug,
        attributeValue.slug,
      ]),
    ),
  }));
}
