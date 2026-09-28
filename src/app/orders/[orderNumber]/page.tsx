import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/currency";
import { CancelOrderButton } from "@/modules/orders/components/cancel-order-button";
import { getOrderByNumberForViewer } from "@/modules/orders/queries";
import { CUSTOMER_CANCELLABLE_STATUSES, ORDER_STATUS_LABELS } from "@/modules/orders/status";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage(props: PageProps<"/orders/[orderNumber]">) {
  const { orderNumber } = await props.params;
  const order = await getOrderByNumberForViewer(orderNumber);
  if (!order) notFound();

  const address = order.addresses.find((a) => a.type === "shipping") ?? order.addresses[0];
  const isCancellable = CUSTOMER_CANCELLABLE_STATUSES.includes(order.status);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Thank you for your order</h1>
          <p className="text-muted-foreground">
            Order <span className="font-medium">{order.orderNumber}</span> ·{" "}
            {ORDER_STATUS_LABELS[order.status]}
          </p>
        </div>
        {isCancellable && <CancelOrderButton orderNumber={order.orderNumber} />}
      </div>

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
                  {item.quantity} × {formatPrice(item.unitPrice)}
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

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
          <CardDescription>
            {order.paymentMethod.name} — {formatPrice(order.total)}
          </CardDescription>
        </CardHeader>
      </Card>

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
