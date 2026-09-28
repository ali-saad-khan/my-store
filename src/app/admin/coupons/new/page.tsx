import type { Metadata } from "next";
import { listCategoryOptions } from "@/modules/categories/queries";
import { CouponForm } from "@/modules/coupons/components/coupon-form";
import { listProductOptions } from "@/modules/products/admin-queries";

export const metadata: Metadata = { title: "New coupon" };

export default async function NewCouponPage() {
  const [productOptions, categoryOptions] = await Promise.all([
    listProductOptions(),
    listCategoryOptions(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">New coupon</h1>
      <CouponForm productOptions={productOptions} categoryOptions={categoryOptions} />
    </div>
  );
}
