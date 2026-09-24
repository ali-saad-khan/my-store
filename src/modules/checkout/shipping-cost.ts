type ShippingRate = {
  rateType: "flat" | "free" | "weight_based" | "order_value_based";
  baseRate: string;
  minOrderValue: string | null;
  freeShippingThreshold: string | null;
  perKgRate: string | null;
};

/** Returns `null` when the rate isn't offered at all (e.g. below its minimum order value). */
export function calculateShippingCost(
  rate: ShippingRate,
  { subtotal, totalWeightKg }: { subtotal: number; totalWeightKg: number },
): number | null {
  if (rate.minOrderValue !== null && subtotal < Number(rate.minOrderValue)) {
    return null;
  }

  switch (rate.rateType) {
    case "free":
      return 0;
    case "flat":
      return Number(rate.baseRate);
    case "order_value_based":
      if (rate.freeShippingThreshold !== null && subtotal >= Number(rate.freeShippingThreshold)) {
        return 0;
      }
      return Number(rate.baseRate);
    case "weight_based":
      return Number(rate.baseRate) + Number(rate.perKgRate ?? 0) * totalWeightKg;
  }
}
