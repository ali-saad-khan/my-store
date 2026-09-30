import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Analytics" description="Last 30 days." />

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventCounts.map((row) => (
              <TableRow key={row.eventName}>
                <TableCell>{EVENT_LABELS[row.eventName] ?? row.eventName}</TableCell>
                <TableCell className="text-right tabular-nums">{row.count}</TableCell>
              </TableRow>
            ))}
            {eventCounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground py-8 text-center">
                  No events recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Most viewed products</h2>
        <div className="border-border overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((row) => (
                <TableRow key={row.productId}>
                  <TableCell>
                    <Link href={`/products/${row.product.slug}`} className="underline">
                      {row.product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                </TableRow>
              ))}
              {topProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground py-8 text-center">
                    No product views recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
