import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/pagination";
import { formatPrice } from "@/lib/currency";
import { OrderFilters } from "@/modules/orders/components/order-filters";
import { listOrdersForAdmin } from "@/modules/orders/queries";
import { ORDER_STATUS_BADGE_VARIANT, ORDER_STATUS_LABELS } from "@/modules/orders/status";
import { orderListSearchSchema } from "@/validations/orders";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const rawSearch = await props.searchParams;
  const search = orderListSearchSchema.parse(rawSearch);
  const result = await listOrdersForAdmin(search);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Orders" description={`${result.total} total.`} />

      <OrderFilters q={search.q} status={search.status} />

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="font-medium underline"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{order.profile?.email ?? order.guestEmail ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPrice(order.total)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(order.placedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No orders match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => {
          const params = new URLSearchParams();
          if (search.q) params.set("q", search.q);
          if (search.status) params.set("status", search.status);
          params.set("page", String(page));
          return `/admin/orders?${params.toString()}`;
        }}
      />
    </div>
  );
}
