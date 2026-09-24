import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/currency";
import { getCustomerForAdmin } from "@/modules/customers/queries";
import { ORDER_STATUS_LABELS } from "@/modules/orders/status";

export const metadata: Metadata = { title: "Customer detail" };

export default async function AdminCustomerDetailPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  const customer = await getCustomerForAdmin(id);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">{customer.fullName ?? customer.email}</h1>
        <p className="text-muted-foreground text-sm">
          {customer.email} · {customer.roles.join(", ")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {customer.orders.length === 0 && (
            <p className="text-muted-foreground text-sm">No orders yet.</p>
          )}
          {customer.orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.orderNumber}`}
              className="hover:bg-muted/50 -mx-2 flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
            >
              <span>{order.orderNumber}</span>
              <span className="text-right">
                <span className="font-medium">{formatPrice(order.total)}</span>{" "}
                <span className="text-muted-foreground">({ORDER_STATUS_LABELS[order.status]})</span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {customer.addresses.length === 0 && (
            <p className="text-muted-foreground">No saved addresses.</p>
          )}
          {customer.addresses.map((address) => (
            <div key={address.id}>
              <p className="font-medium">{address.recipientName}</p>
              <p className="text-muted-foreground">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.cityName}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
