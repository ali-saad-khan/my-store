import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { formatPrice } from "@/lib/currency";
import { requireAdmin } from "@/modules/auth/session";
import { OrderFilters } from "@/modules/orders/components/order-filters";
import { listOrdersForAdmin } from "@/modules/orders/queries";
import { ORDER_STATUS_LABELS } from "@/modules/orders/status";
import { orderListSearchSchema } from "@/validations/orders";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  await requireAdmin();

  const rawSearch = await props.searchParams;
  const search = orderListSearchSchema.parse(rawSearch);
  const result = await listOrdersForAdmin(search);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground text-sm">{result.total} total.</p>
      </div>

      <OrderFilters q={search.q} status={search.status} />

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Order</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {result.items.map((order) => (
              <tr key={order.id}>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="font-medium underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-3 py-2">{order.profile?.email ?? order.guestEmail ?? "—"}</td>
                <td className="px-3 py-2">{ORDER_STATUS_LABELS[order.status]}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPrice(order.total)}</td>
                <td className="text-muted-foreground px-3 py-2">
                  {new Date(order.placedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-3 py-8 text-center">
                  No orders match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
