import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/currency";
import { getDashboardStats, getRecentOrders } from "@/modules/admin/dashboard";
import { ORDER_STATUS_LABELS } from "@/modules/orders/status";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboardPage() {
  const [stats, recentOrders] = await Promise.all([getDashboardStats(), getRecentOrders()]);

  const cards = [
    { label: "Revenue (paid)", value: formatPrice(stats.revenue) },
    { label: "Orders", value: stats.orderCount },
    { label: "Customers", value: stats.customerCount },
    { label: "Products sold", value: stats.productsSold },
    {
      label: "Pending orders",
      value: stats.pendingOrderCount,
      href: "/admin/orders?status=pending",
    },
    { label: "Low-stock products", value: stats.lowStockCount, href: "/admin/inventory" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              {card.href ? (
                <Link href={card.href} className="block">
                  <p className="text-muted-foreground text-sm">{card.label}</p>
                  <p className="text-2xl font-semibold">{card.value}</p>
                </Link>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">{card.label}</p>
                  <p className="text-2xl font-semibold">{card.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentOrders.length === 0 && (
            <p className="text-muted-foreground text-sm">No orders yet.</p>
          )}
          {recentOrders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.orderNumber}`}
              className="hover:bg-muted/50 -mx-2 flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
            >
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-muted-foreground">{order.profile?.email ?? order.guestEmail}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatPrice(order.total)}</p>
                <p className="text-muted-foreground">{ORDER_STATUS_LABELS[order.status]}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
