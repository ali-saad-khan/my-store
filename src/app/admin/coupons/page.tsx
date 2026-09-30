import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { RowActionsMenu } from "@/components/admin/row-actions-menu";
import { SavedToast } from "@/components/admin/saved-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/currency";
import { deleteCouponAction } from "@/modules/coupons/actions";
import { listCouponsForAdmin } from "@/modules/coupons/queries";
import type { BadgeVariant } from "@/modules/orders/status";

export const metadata: Metadata = { title: "Coupons" };

function status(coupon: { isActive: boolean; expiresAt: Date | null }): {
  label: string;
  variant: BadgeVariant;
} {
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { label: "Expired", variant: "destructive" };
  }
  return coupon.isActive
    ? { label: "Active", variant: "default" }
    : { label: "Inactive", variant: "secondary" };
}

export default async function AdminCouponsPage() {
  const coupons = await listCouponsForAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Suspense fallback={null}>
        <SavedToast message="Coupon saved." />
      </Suspense>
      <PageHeader
        title="Coupons"
        action={
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/coupons/new">New coupon</Link>}
          />
        }
      />

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => {
              const { label, variant } = status(coupon);
              return (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <Link
                      href={`/admin/coupons/${coupon.id}/edit`}
                      className="font-medium underline"
                    >
                      {coupon.code}
                    </Link>
                    {coupon.description && (
                      <div className="text-muted-foreground">{coupon.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {coupon.discountType === "percentage"
                      ? `${Number(coupon.discountValue)}%`
                      : formatPrice(coupon.discountValue)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.usages.length}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant}>{label}</Badge>
                  </TableCell>
                  <TableCell>
                    <RowActionsMenu
                      editHref={`/admin/coupons/${coupon.id}/edit`}
                      deleteAction={deleteCouponAction}
                      deleteHiddenFields={{ id: coupon.id }}
                      deleteTitle={`Delete coupon "${coupon.code}"?`}
                      deleteDescription="This can be restored later, but it will stop working immediately."
                      deleteSuccessMessage="Coupon deleted."
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No coupons yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
