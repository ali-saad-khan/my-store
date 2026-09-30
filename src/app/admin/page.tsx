import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Clock, DollarSign, Package, ShoppingCart, Users } from "lucide-react";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/currency";
import {
  getDashboardStats,
  getPeriodComparison,
  getRecentOrders,
  getRevenueTrend,
} from "@/modules/admin/dashboard";
import { ORDER_STATUS_BADGE_VARIANT, ORDER_STATUS_LABELS } from "@/modules/orders/status";

export const metadata: Metadata = { title: "Admin" };

function percentChange(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

export default async function AdminDashboardPage() {
  const [stats, recentOrders, { current, previous }, revenueTrend] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(),
    getPeriodComparison(30),
    getRevenueTrend(30),
  ]);

  const revenueDelta = percentChange(Number(current.revenue), Number(previous.revenue));
  const orderDelta = percentChange(current.orderCount, previous.orderCount);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Revenue (paid)"
          value={formatPrice(stats.revenue)}
          icon={DollarSign}
          deltaPercent={revenueDelta}
        />
        <StatCard
          label="Orders"
          value={stats.orderCount}
          icon={ShoppingCart}
          deltaPercent={orderDelta}
        />
        <StatCard label="Customers" value={stats.customerCount} icon={Users} />
        <StatCard label="Products sold" value={stats.productsSold} icon={Package} />
        <StatCard
          label="Pending orders"
          value={stats.pendingOrderCount}
          icon={Clock}
          href="/admin/orders?status=pending"
        />
        <StatCard
          label="Low-stock products"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          href="/admin/inventory"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue, last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenueTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.orderNumber}`}
                        className="font-medium underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.profile?.email ?? order.guestEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(order.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
