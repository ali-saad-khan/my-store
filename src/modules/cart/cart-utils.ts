import type { getActiveCart } from "./queries";

type Cart = NonNullable<Awaited<ReturnType<typeof getActiveCart>>>;
type CartItem = Cart["items"][number];

function quantityAvailableFor(item: CartItem) {
  const inventoryRows = item.variant ? item.variant.inventory : item.product.inventory;
  return inventoryRows.reduce((sum, row) => sum + (row.quantityOnHand - row.quantityReserved), 0);
}

function variantLabelFor(item: CartItem) {
  if (!item.variant) return null;
  return item.variant.attributeValues.map(({ attributeValue }) => attributeValue.value).join(" / ");
}

export function toCartItemView(item: CartItem) {
  const quantityAvailable = quantityAvailableFor(item);

  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSlug: item.product.slug,
    imageUrl: item.product.images[0]?.url ?? null,
    variantId: item.variantId,
    variantLabel: variantLabelFor(item),
    sku: item.variant?.sku ?? item.product.sku,
    quantity: item.quantity,
    unitPrice: item.unitPriceSnapshot,
    lineTotal: (Number(item.unitPriceSnapshot) * item.quantity).toFixed(2),
    quantityAvailable,
    isAvailable: quantityAvailable > 0,
  };
}

export type CartItemView = ReturnType<typeof toCartItemView>;

export function toCartView(cart: Cart) {
  const items = cart.items.map(toCartItemView);

  return {
    id: cart.id,
    currencyCode: cart.currencyCode,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + Number(item.lineTotal), 0).toFixed(2),
  };
}
