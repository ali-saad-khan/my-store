import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BannerForm } from "@/modules/banners/components/banner-form";
import { getBannerByIdForAdmin } from "@/modules/banners/queries";

export const metadata: Metadata = { title: "Edit banner" };

export default async function EditBannerPage(props: PageProps<"/admin/banners/[id]/edit">) {
  const { id } = await props.params;
  const banner = await getBannerByIdForAdmin(id);
  if (!banner) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit banner</h1>
      <BannerForm banner={banner} />
    </div>
  );
}
