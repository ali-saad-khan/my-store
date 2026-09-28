import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import { DeleteCouponButton } from "@/modules/coupons/components/delete-coupon-button";
import { listCouponsForAdmin } from "@/modules/coupons/queries";

export const metadata: Metadata = { title: "Coupons" };

function statusLabel(coupon: { isActive: boolean; expiresAt: Date | null }) {
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return "Expired";
  return coupon.isActive ? "Active" : "Inactive";
}

export default async function AdminCouponsPage() {
  const coupons = await listCouponsForAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/admin/coupons/new">New coupon</Link>} />
      </div>

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Discount</th>
              <th className="px-3 py-2 font-medium">Usage</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td className="px-3 py-2">
                  <Link href={`/admin/coupons/${coupon.id}/edit`} className="font-medium underline">
                    {coupon.code}
                  </Link>
                  {coupon.description && (
                    <div className="text-muted-foreground">{coupon.description}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {coupon.discountType === "percentage"
                    ? `${Number(coupon.discountValue)}%`
                    : formatPrice(coupon.discountValue)}
                </td>
                <td className="text-muted-foreground px-3 py-2">
                  {coupon.usages.length}
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                </td>
                <td className="px-3 py-2">{statusLabel(coupon)}</td>
                <td className="px-3 py-2 text-right">
                  <DeleteCouponButton couponId={coupon.id} code={coupon.code} />
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-3 py-8 text-center">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
