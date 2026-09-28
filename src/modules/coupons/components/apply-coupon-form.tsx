"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/currency";
import { applyCouponAction, removeCouponAction } from "@/modules/coupons/actions";

type AppliedCoupon = { code: string; discountType: "percentage" | "fixed"; discountValue: string };

async function removeCouponFormAction() {
  await removeCouponAction();
}

/**
 * When `embedded` (used inside the checkout page's own `<form>`), renders no
 * `<form>` of its own — a nested `<form>` is invalid HTML and was caught live
 * as a hydration warning. Instead every button carries its own `formAction`
 * (overriding whichever form it ends up inside) plus `formNoValidate` (so
 * clicking "Apply"/"Remove" doesn't trip checkout's other required-field
 * validation). Standalone (cart page) usage renders its own `<form>` for the
 * same buttons, unaffected by the mode.
 *
 * Pending state comes from each button's own `useActionState`, not
 * `useFormStatus` — that hook reports the nearest ancestor *form's* pending
 * status, which on the checkout page is shared with "Place order" and would
 * flash "Placing order..." just from clicking "Apply" (caught live).
 */
export function ApplyCouponForm({
  coupon,
  discountAmount,
  couponError,
  embedded = false,
}: {
  coupon: AppliedCoupon | null;
  discountAmount: string;
  couponError: string | null;
  embedded?: boolean;
}) {
  const [applyState, applyAction, applyPending] = useActionState(applyCouponAction, undefined);
  const [, removeAction, removePending] = useActionState(removeCouponFormAction, undefined);

  const body = coupon ? (
    <div className="space-y-2">
      <FormMessage error={couponError ?? undefined} />
      <div className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
        <span>
          Coupon <span className="font-medium">{coupon.code}</span>
          {Number(discountAmount) > 0 && ` — -${formatPrice(discountAmount)}`}
        </span>
        <button
          type="submit"
          formAction={removeAction}
          formNoValidate
          disabled={removePending}
          className="text-destructive hover:underline disabled:opacity-50"
        >
          {removePending ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  ) : (
    <div className="space-y-2">
      <FormMessage error={applyState?.error} success={applyState?.success} />
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="code">Coupon code</Label>
          <Input id="code" name="code" placeholder="e.g. WELCOME10" />
        </div>
        <button
          type="submit"
          formAction={applyAction}
          formNoValidate
          disabled={applyPending}
          className="bg-primary text-primary-foreground h-8 shrink-0 rounded-lg px-3 text-sm disabled:opacity-50"
        >
          {applyPending ? "Applying..." : "Apply"}
        </button>
      </div>
    </div>
  );

  if (embedded) return body;
  return <form action={applyAction}>{body}</form>;
}
