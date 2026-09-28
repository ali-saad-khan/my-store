"use client";

import { useActionState, useMemo, useState } from "react";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/currency";
import { placeOrderAction } from "@/modules/checkout/actions";
import { calculateShippingCost } from "@/modules/checkout/shipping-cost";
import { ApplyCouponForm } from "@/modules/coupons/components/apply-coupon-form";

type CartView = {
  items: {
    id: string;
    productName: string;
    variantLabel: string | null;
    quantity: number;
    lineTotal: string;
  }[];
  subtotal: string;
  totalWeightKg: number;
};

type SavedAddress = {
  id: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  cityId: string;
  cityName: string;
  postalCode: string | null;
};

type City = { id: string; name: string; zoneId: string | null };

type ShippingRateOption = {
  id: string;
  zoneId: string;
  methodName: string;
  rateType: "flat" | "free" | "weight_based" | "order_value_based";
  baseRate: string;
  minOrderValue: string | null;
  freeShippingThreshold: string | null;
  perKgRate: string | null;
};

export function CheckoutForm({
  cart,
  coupon,
  discountAmount,
  couponError,
  profileEmail,
  profilePhone,
  savedAddresses,
  cities,
  ratesByZoneId,
  paymentMethods,
}: {
  cart: CartView;
  coupon: { code: string; discountType: "percentage" | "fixed"; discountValue: string } | null;
  discountAmount: string;
  couponError: string | null;
  profileEmail: string | null;
  profilePhone: string | null;
  savedAddresses: SavedAddress[];
  cities: City[];
  ratesByZoneId: Record<string, ShippingRateOption[]>;
  paymentMethods: { code: string; name: string }[];
}) {
  const [state, formAction, isPlacingOrder] = useActionState(placeOrderAction, undefined);

  const [addressMode, setAddressMode] = useState<"saved" | "new">(
    savedAddresses.length > 0 ? "saved" : "new",
  );
  const [savedAddressId, setSavedAddressId] = useState(savedAddresses[0]?.id ?? "");
  const [cityId, setCityId] = useState(cities[0]?.id ?? "");

  const activeCityId =
    addressMode === "saved"
      ? (savedAddresses.find((a) => a.id === savedAddressId)?.cityId ?? "")
      : cityId;
  const activeZoneId = cities.find((c) => c.id === activeCityId)?.zoneId ?? null;

  const subtotal = Number(cart.subtotal);
  const offeredRates = useMemo(() => {
    const availableRates = activeZoneId ? (ratesByZoneId[activeZoneId] ?? []) : [];
    return availableRates
      .map((rate) => ({
        rate,
        cost: calculateShippingCost(rate, { subtotal, totalWeightKg: cart.totalWeightKg }),
      }))
      .filter((r) => r.cost !== null);
  }, [activeZoneId, ratesByZoneId, subtotal, cart.totalWeightKg]);

  const [chosenShippingRateId, setChosenShippingRateId] = useState<string | null>(null);
  const shippingRateId = offeredRates.some((r) => r.rate.id === chosenShippingRateId)
    ? chosenShippingRateId!
    : (offeredRates[0]?.rate.id ?? "");
  const selectedShippingCost = offeredRates.find((r) => r.rate.id === shippingRateId)?.cost ?? 0;
  const estimatedTotal = subtotal - Number(discountAmount) + selectedShippingCost;

  return (
    <form action={formAction} className="space-y-8">
      <FormMessage error={state?.error} />

      <section className="space-y-4">
        <h2 className="font-medium">Contact information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={profileEmail ?? ""}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={profilePhone ?? ""} required />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Delivery address</h2>

        {savedAddresses.length > 0 && (
          <div className="space-y-2">
            {savedAddresses.map((address) => (
              <label
                key={address.id}
                className="border-border has-checked:border-foreground flex items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <input
                  type="radio"
                  name="addressChoice"
                  checked={addressMode === "saved" && savedAddressId === address.id}
                  onChange={() => {
                    setAddressMode("saved");
                    setSavedAddressId(address.id);
                  }}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{address.recipientName}</span> · {address.phone}
                  <br />
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}, {address.cityName}
                  {address.postalCode ? ` ${address.postalCode}` : ""}
                </span>
              </label>
            ))}
            <label className="border-border has-checked:border-foreground flex items-center gap-3 rounded-lg border p-3 text-sm">
              <input
                type="radio"
                name="addressChoice"
                checked={addressMode === "new"}
                onChange={() => setAddressMode("new")}
              />
              Use a new address
            </label>
          </div>
        )}

        {addressMode === "saved" && (
          <input type="hidden" name="savedAddressId" value={savedAddressId} />
        )}

        {addressMode === "new" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="recipientName">Recipient name</Label>
              <Input id="recipientName" name="recipientName" required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="line1">Address</Label>
              <Input id="line1" name="line1" required />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="line2">Apartment, suite, etc. (optional)</Label>
              <Input id="line2" name="line2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cityId">City</Label>
              <select
                id="cityId"
                name="cityId"
                value={cityId}
                onChange={(event) => setCityId(event.target.value)}
                className="border-border bg-background h-8 w-full rounded-lg border px-2.5 text-sm"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postalCode">Postal code (optional)</Label>
              <Input id="postalCode" name="postalCode" />
            </div>
            {profileEmail && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="saveAddress" className="size-4" />
                Save this address to my account
              </label>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Shipping method</h2>
        {offeredRates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No shipping methods are available for this address yet.
          </p>
        ) : (
          <div className="space-y-2">
            {offeredRates.map(({ rate, cost }) => (
              <label
                key={rate.id}
                className="border-border has-checked:border-foreground flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shippingRateId"
                    value={rate.id}
                    checked={shippingRateId === rate.id}
                    onChange={() => setChosenShippingRateId(rate.id)}
                  />
                  {rate.methodName}
                </span>
                <span className="font-medium">{cost === 0 ? "Free" : formatPrice(cost ?? 0)}</span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Payment method</h2>
        {paymentMethods.map((method) => (
          <label
            key={method.code}
            className="border-border has-checked:border-foreground flex items-center gap-3 rounded-lg border p-3 text-sm"
          >
            <input
              type="radio"
              name="paymentMethodCode"
              value={method.code}
              defaultChecked
              readOnly
            />
            {method.name}
          </label>
        ))}
      </section>

      <section className="space-y-1.5">
        <Label htmlFor="notes">Order notes (optional)</Label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="border-border bg-background w-full rounded-lg border px-2.5 py-1.5 text-sm"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Coupon</h2>
        <ApplyCouponForm
          coupon={coupon}
          discountAmount={discountAmount}
          couponError={couponError}
          embedded
        />
      </section>

      <section className="space-y-2 border-t pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal ({cart.items.length} item(s))</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {Number(discountAmount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount ({coupon?.code})</span>
            <span>-{formatPrice(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span>{selectedShippingCost === 0 ? "Free" : formatPrice(selectedShippingCost)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold">
          <span>Estimated total</span>
          <span>{formatPrice(estimatedTotal)}</span>
        </div>
        <p className="text-muted-foreground text-xs">
          Tax (if applicable) is calculated when your order is placed.
        </p>
      </section>

      <Button
        type="submit"
        formAction={formAction}
        size="lg"
        className="w-full"
        disabled={isPlacingOrder || offeredRates.length === 0}
      >
        {isPlacingOrder ? "Placing order..." : "Place order"}
      </Button>
    </form>
  );
}
