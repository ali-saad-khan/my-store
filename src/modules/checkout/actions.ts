"use server";

import { redirect } from "next/navigation";
import { getAddressForProfile } from "@/modules/addresses/queries";
import { createAddressForProfile, resolveCityGeography } from "@/modules/addresses/mutations";
import { getCurrentUser } from "@/modules/auth/session";
import { resolveCartOwner } from "@/modules/cart/queries";
import { clearCartSessionCookie } from "@/modules/cart/session";
import { placeOrderSchema } from "@/validations/checkout";
import {
  CouponNoLongerValidError,
  EmptyCartError,
  InsufficientStockForOrderError,
  InvalidShippingRateError,
  ItemUnavailableError,
  PaymentMethodUnavailableError,
  placeOrder,
  type OrderAddressSnapshot,
} from "./mutations";

export type PlaceOrderActionState = { error?: string } | undefined;

export async function placeOrderAction(
  _prevState: PlaceOrderActionState,
  formData: FormData,
): Promise<PlaceOrderActionState> {
  const owner = await resolveCartOwner();
  if (!owner) return { error: "Your cart is empty." };

  const parsed = placeOrderSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
    savedAddressId: formData.get("savedAddressId"),
    recipientName: formData.get("recipientName"),
    cityId: formData.get("cityId"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    postalCode: formData.get("postalCode"),
    saveAddress: formData.get("saveAddress"),
    shippingRateId: formData.get("shippingRateId"),
    paymentMethodCode: formData.get("paymentMethodCode"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const [firstError] = Object.values(parsed.error.flatten().fieldErrors).flat();
    return { error: firstError ?? parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await getCurrentUser();
  const data = parsed.data;

  let address: OrderAddressSnapshot;
  try {
    if (data.savedAddressId) {
      if (!user) return { error: "Sign in to use a saved address." };
      const saved = await getAddressForProfile(data.savedAddressId, user.id);
      if (!saved) return { error: "That saved address couldn't be found." };
      address = {
        sourceAddressId: saved.id,
        recipientName: saved.recipientName,
        phone: saved.phone,
        line1: saved.line1,
        line2: saved.line2 ?? undefined,
        cityName: saved.cityName,
        stateName: saved.state?.name,
        countryName: saved.country.name,
        countryId: saved.countryId,
        stateId: saved.stateId,
        postalCode: saved.postalCode ?? undefined,
      };
    } else {
      if (!data.recipientName || !data.cityId || !data.line1) {
        return { error: "Enter a delivery address." };
      }
      const city = await resolveCityGeography(data.cityId);
      address = {
        recipientName: data.recipientName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2,
        cityName: city.name,
        stateName: city.state?.name,
        countryName: city.country.name,
        countryId: city.countryId,
        stateId: city.stateId,
        postalCode: data.postalCode,
      };

      if (user && data.saveAddress) {
        await createAddressForProfile(user.id, {
          recipientName: data.recipientName,
          phone: data.phone,
          cityId: data.cityId,
          line1: data.line1,
          line2: data.line2,
          postalCode: data.postalCode,
        });
      }
    }
  } catch {
    return { error: "That address couldn't be used. Double-check the city and try again." };
  }

  try {
    const order = await placeOrder({
      cartOwner: owner,
      profileId: user?.id ?? null,
      email: data.email,
      phone: data.phone,
      address,
      shippingRateId: data.shippingRateId,
      notes: data.notes,
    });

    if (!user) await clearCartSessionCookie();

    redirect(`/orders/${order.orderNumber}`);
  } catch (error) {
    if (
      error instanceof EmptyCartError ||
      error instanceof ItemUnavailableError ||
      error instanceof InsufficientStockForOrderError ||
      error instanceof InvalidShippingRateError ||
      error instanceof PaymentMethodUnavailableError ||
      error instanceof CouponNoLongerValidError
    ) {
      return { error: error.message };
    }
    throw error;
  }
}
