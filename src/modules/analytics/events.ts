/**
 * The event catalog — MasterPlan.txt section 25's example list. Adding a new event means
 * adding a key here with its payload shape, then calling `track()` from the thin
 * action/page layer that already has the relevant data — never from deep inside a
 * mutation/business-logic function (keeps analytics out of the domain layer).
 */
export type AnalyticsEventMap = {
  product_viewed: { productId: string; productSlug: string; productName: string };
  product_added_to_cart: { productId: string; variantId?: string; quantity: number };
  cart_viewed: { itemCount: number; subtotal: string };
  checkout_started: { itemCount: number; subtotal: string };
  payment_started: { paymentMethodCode: string };
  order_created: { orderId: string; orderNumber: string; total: string };
  order_completed: { orderId: string; orderNumber: string; total: string };
  product_searched: { query: string; resultCount: number };
  wishlist_added: { productId: string };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
