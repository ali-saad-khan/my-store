"use client";

import { deleteCouponAction } from "@/modules/coupons/actions";

export function DeleteCouponButton({ couponId, code }: { couponId: string; code: string }) {
  return (
    <form
      action={deleteCouponAction}
      onSubmit={(event) => {
        if (!confirm(`Delete coupon "${code}"? This can't be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={couponId} />
      <button type="submit" className="text-destructive text-sm hover:underline">
        Delete
      </button>
    </form>
  );
}
