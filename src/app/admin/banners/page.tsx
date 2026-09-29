import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteBannerButton } from "@/modules/banners/components/delete-banner-button";
import { listBannersForAdmin } from "@/modules/banners/queries";

export const metadata: Metadata = { title: "Banners" };

export default async function AdminBannersPage() {
  const banners = await listBannersForAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Banners</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/admin/banners/new">New banner</Link>} />
      </div>
      <p className="text-muted-foreground text-sm">
        Shown as a hero slider at the top of the homepage, in sort-order. Inactive banners are
        hidden from the storefront but kept here for later reuse.
      </p>

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Image</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Sort</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {banners.map((banner) => (
              <tr key={banner.id}>
                <td className="px-3 py-2">
                  <div className="bg-muted relative h-10 w-16 overflow-hidden rounded">
                    <Image src={banner.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/banners/${banner.id}/edit`} className="font-medium underline">
                    {banner.title || "(untitled)"}
                  </Link>
                </td>
                <td className="text-muted-foreground px-3 py-2">{banner.sortOrder}</td>
                <td className="px-3 py-2">{banner.isActive ? "Active" : "Inactive"}</td>
                <td className="px-3 py-2 text-right">
                  <DeleteBannerButton bannerId={banner.id} bannerTitle={banner.title ?? ""} />
                </td>
              </tr>
            ))}
            {banners.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-3 py-8 text-center">
                  No banners yet — the homepage shows its plain text hero until you add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
