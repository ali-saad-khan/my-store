import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listCategoryOptions } from "@/modules/categories/queries";
import { CouponForm } from "@/modules/coupons/components/coupon-form";
import { getCouponForAdmin } from "@/modules/coupons/queries";
import { listProductOptions } from "@/modules/products/admin-queries";

export const metadata: Metadata = { title: "Edit coupon" };

export default async function EditCouponPage(props: PageProps<"/admin/coupons/[id]/edit">) {
  const { id } = await props.params;
  const [coupon, productOptions, categoryOptions] = await Promise.all([
    getCouponForAdmin(id),
    listProductOptions(),
    listCategoryOptions(),
  ]);
  if (!coupon) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit coupon</h1>
      <CouponForm
        coupon={{
          ...coupon,
          productIds: coupon.products.map((p) => p.productId),
          categoryIds: coupon.categories.map((c) => c.categoryId),
        }}
        productOptions={productOptions}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
