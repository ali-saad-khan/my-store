"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCouponAction,
  updateCouponAction,
  type CouponActionState,
} from "@/modules/coupons/actions";

type Option = { id: string; name: string };

type CouponDefaults = {
  id?: string;
  code?: string;
  description?: string | null;
  discountType?: "percentage" | "fixed";
  discountValue?: string;
  minOrderValue?: string | null;
  maxDiscountAmount?: string | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  isActive?: boolean;
  productIds?: string[];
  categoryIds?: string[];
};

function toDateInputValue(date?: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function CouponForm({
  coupon,
  productOptions,
  categoryOptions,
}: {
  coupon?: CouponDefaults;
  productOptions: Option[];
  categoryOptions: Option[];
}) {
  const action = coupon?.id ? updateCouponAction : createCouponAction;
  const [state, formAction] = useActionState<CouponActionState, FormData>(action, undefined);
  const [discountType, setDiscountType] = useState(coupon?.discountType ?? "percentage");

  return (
    <form action={formAction} className="space-y-4">
      {coupon?.id && <input type="hidden" name="id" value={coupon.id} />}
      <FormMessage error={state?.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" defaultValue={coupon?.code} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discountType">Discount type</Label>
          <select
            id="discountType"
            name="discountType"
            value={discountType}
            onChange={(event) => setDiscountType(event.target.value as "percentage" | "fixed")}
            className="border-border bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discountValue">
            Discount value {discountType === "percentage" ? "(%)" : ""}
          </Label>
          <Input
            id="discountValue"
            name="discountValue"
            type="number"
            step="0.01"
            min="0"
            max={discountType === "percentage" ? 100 : undefined}
            defaultValue={coupon?.discountValue}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxDiscountAmount">Max discount amount (optional)</Label>
          <Input
            id="maxDiscountAmount"
            name="maxDiscountAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={coupon?.maxDiscountAmount ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minOrderValue">Minimum order value (optional)</Label>
          <Input
            id="minOrderValue"
            name="minOrderValue"
            type="number"
            step="0.01"
            min="0"
            defaultValue={coupon?.minOrderValue ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="usageLimit">Total usage limit (optional)</Label>
          <Input
            id="usageLimit"
            name="usageLimit"
            type="number"
            min="1"
            defaultValue={coupon?.usageLimit ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="perCustomerLimit">Per-customer limit (optional)</Label>
          <Input
            id="perCustomerLimit"
            name="perCustomerLimit"
            type="number"
            min="1"
            defaultValue={coupon?.perCustomerLimit ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startsAt">Starts at (optional)</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="date"
            defaultValue={toDateInputValue(coupon?.startsAt)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expiresAt">Expires at (optional)</Label>
          <Input
            id="expiresAt"
            name="expiresAt"
            type="date"
            defaultValue={toDateInputValue(coupon?.expiresAt)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description (optional)</Label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={coupon?.description ?? ""}
            className="border-border bg-background w-full rounded-lg border px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoryIds">Restrict to categories (optional)</Label>
          <select
            id="categoryIds"
            name="categoryIds"
            multiple
            defaultValue={coupon?.categoryIds ?? []}
            className="border-border bg-background h-32 w-full rounded-lg border px-2 py-1 text-sm"
          >
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            None selected = applies to every category.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="productIds">Restrict to products (optional)</Label>
          <select
            id="productIds"
            name="productIds"
            multiple
            defaultValue={coupon?.productIds ?? []}
            className="border-border bg-background h-32 w-full rounded-lg border px-2 py-1 text-sm"
          >
            {productOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">None selected = applies to every product.</p>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={coupon?.isActive ?? true}
            className="size-4"
          />
          Active
        </label>
      </div>

      <SubmitButton pendingText="Saving...">
        {coupon?.id ? "Save changes" : "Create coupon"}
      </SubmitButton>
    </form>
  );
}
