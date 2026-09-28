import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/currency";
import { UpdateOrderStatusForm } from "@/modules/orders/components/update-order-status-form";
import { getOrderForAdmin } from "@/modules/orders/queries";
import { allowedNextStatuses, ORDER_STATUS_LABELS } from "@/modules/orders/status";

export const metadata: Metadata = { title: "Order detail" };

export default async function AdminOrderDetailPage(
  props: PageProps<"/admin/orders/[orderNumber]">,
) {
  const { orderNumber } = await props.params;
  const order = await getOrderForAdmin(orderNumber);
  if (!order) notFound();

  const address = order.addresses.find((a) => a.type === "shipping") ?? order.addresses[0];
  const payment = order.payments[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Order {order.orderNumber}</h1>
        <p className="text-muted-foreground text-sm">
          {order.profile?.email ?? order.guestEmail} · {ORDER_STATUS_LABELS[order.status]}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update status</CardTitle>
        </CardHeader>
        <CardContent>
          <UpdateOrderStatusForm
            orderNumber={order.orderNumber}
            nextStatuses={allowedNextStatuses(order.status)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <p className="font-medium">{item.productNameSnapshot}</p>
                {item.variantLabelSnapshot && (
                  <p className="text-muted-foreground">{item.variantLabelSnapshot}</p>
                )}
                <p className="text-muted-foreground">
                  {item.quantity} × {formatPrice(item.unitPrice)} · SKU {item.skuSnapshot}
                </p>
              </div>
              <p className="font-medium">{formatPrice(item.subtotal)}</p>
            </div>
          ))}
          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {Number(order.discountTotal) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Discount{order.coupon ? ` (${order.coupon.code})` : ""}
                </span>
                <span>-{formatPrice(order.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatPrice(order.shippingTotal)}</span>
            </div>
            {Number(order.taxTotal) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(order.taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {address && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{address.recipientName}</p>
            <p>{address.phone}</p>
            <p>
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
            </p>
            <p>
              {address.cityName}
              {address.stateName ? `, ${address.stateName}` : ""}, {address.countryName}
              {address.postalCode ? ` ${address.postalCode}` : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {payment && (
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>
              {order.paymentMethod.name} — {formatPrice(payment.amount)} — {payment.status}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {payment.transactions.map((txn) => (
              <div key={txn.id} className="text-muted-foreground flex justify-between">
                <span>
                  {txn.type} ({txn.status})
                </span>
                <span>{new Date(txn.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {order.statusHistory.map((entry) => (
            <div key={entry.id} className="flex justify-between">
              <span>
                {ORDER_STATUS_LABELS[entry.toStatus]}
                {entry.note && <span className="text-muted-foreground"> — {entry.note}</span>}
              </span>
              <span className="text-muted-foreground shrink-0">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
