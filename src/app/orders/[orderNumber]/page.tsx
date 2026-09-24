import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/currency";
import { getOrderByNumberForViewer } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Order confirmation" };

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

export default async function OrderConfirmationPage(props: PageProps<"/orders/[orderNumber]">) {
  const { orderNumber } = await props.params;
  const order = await getOrderByNumberForViewer(orderNumber);
  if (!order) notFound();

  const address = order.addresses.find((a) => a.type === "shipping") ?? order.addresses[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Thank you for your order</h1>
        <p className="text-muted-foreground">
          Order <span className="font-medium">{order.orderNumber}</span> ·{" "}
          {STATUS_LABELS[order.status] ?? order.status}
        </p>
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
    </div>
  );
}
