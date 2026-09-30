import type { Metadata } from "next";
import Image from "next/image";
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
import { deleteBannerAction } from "@/modules/banners/actions";
import { listBannersForAdmin } from "@/modules/banners/queries";

export const metadata: Metadata = { title: "Banners" };

export default async function AdminBannersPage() {
  const banners = await listBannersForAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Suspense fallback={null}>
        <SavedToast message="Banner saved." />
      </Suspense>
      <PageHeader
        title="Banners"
        description="Shown as a hero slider at the top of the homepage, in sort-order. Inactive banners are hidden from the storefront but kept here for later reuse."
        action={
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/banners/new">New banner</Link>}
          />
        }
      />

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>
                  <div className="bg-muted relative h-10 w-16 overflow-hidden rounded">
                    <Image src={banner.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/banners/${banner.id}/edit`} className="font-medium underline">
                    {banner.title || "(untitled)"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{banner.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={banner.isActive ? "default" : "secondary"}>
                    {banner.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <RowActionsMenu
                    editHref={`/admin/banners/${banner.id}/edit`}
                    deleteAction={deleteBannerAction}
                    deleteHiddenFields={{ id: banner.id }}
                    deleteTitle={`Delete the "${banner.title || "untitled"}" banner?`}
                    deleteDescription="This can't be undone."
                    deleteSuccessMessage="Banner deleted."
                  />
                </TableCell>
              </TableRow>
            ))}
            {banners.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No banners yet — the homepage shows its plain text hero until you add one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
