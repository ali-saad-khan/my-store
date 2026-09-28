import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listAddressesForProfile } from "@/modules/addresses/queries";
import { getCurrentProfile } from "@/modules/auth/session";
import { toCartView } from "@/modules/cart/cart-utils";
import { getActiveCart } from "@/modules/cart/queries";
import { CheckoutForm } from "@/modules/checkout/components/checkout-form";
import { getActivePaymentMethods, getCheckoutGeography } from "@/modules/checkout/queries";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const cart = await getActiveCart();
  const view = cart ? await toCartView(cart) : null;
  if (!view || view.items.length === 0) redirect("/cart");

  const [profile, geography, paymentMethods] = await Promise.all([
    getCurrentProfile(),
    getCheckoutGeography(),
    getActivePaymentMethods(),
  ]);

  const savedAddresses = profile ? await listAddressesForProfile(profile.id) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <CheckoutForm
        cart={view}
        coupon={view.coupon}
        discountAmount={view.discountAmount}
        couponError={view.couponError}
        profileEmail={profile?.email ?? null}
        profilePhone={profile?.phone ?? null}
        savedAddresses={savedAddresses.map((address) => ({
          id: address.id,
          recipientName: address.recipientName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          cityId: address.cityId ?? "",
          cityName: address.cityName,
          postalCode: address.postalCode,
        }))}
        cities={geography.cities}
        ratesByZoneId={Object.fromEntries(
          [...geography.ratesByZoneId.entries()].map(([zoneId, rates]) => [zoneId, rates]),
        )}
        paymentMethods={paymentMethods.map((method) => ({ code: method.code, name: method.name }))}
      />
    </div>
  );
}
