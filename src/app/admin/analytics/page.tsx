import type { Metadata } from "next";
import Link from "next/link";
import {
  getEventCountsLast30Days,
  getMostViewedProductsLast30Days,
} from "@/modules/analytics/queries";

export const metadata: Metadata = { title: "Analytics" };

const EVENT_LABELS: Record<string, string> = {
  product_viewed: "Products viewed",
  product_added_to_cart: "Added to cart",
  cart_viewed: "Carts viewed",
  checkout_started: "Checkouts started",
  payment_started: "Payments started",
  order_created: "Orders created",
  order_completed: "Orders completed (delivered)",
  product_searched: "Searches",
  wishlist_added: "Wishlist adds",
};

export default async function AdminAnalyticsPage() {
  const [eventCounts, topProducts] = await Promise.all([
    getEventCountsLast30Days(),
    getMostViewedProductsLast30Days(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Last 30 days.</p>
      </div>

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Event</th>
              <th className="px-3 py-2 text-right font-medium">Count</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {eventCounts.map((row) => (
              <tr key={row.eventName}>
                <td className="px-3 py-2">{EVENT_LABELS[row.eventName] ?? row.eventName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
              </tr>
            ))}
            {eventCounts.length === 0 && (
              <tr>
                <td colSpan={2} className="text-muted-foreground px-3 py-8 text-center">
                  No events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Most viewed products</h2>
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 text-right font-medium">Views</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {topProducts.map((row) => (
                <tr key={row.productId}>
                  <td className="px-3 py-2">
                    <Link href={`/products/${row.product.slug}`} className="underline">
                      {row.product.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-muted-foreground px-3 py-8 text-center">
                    No product views recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
