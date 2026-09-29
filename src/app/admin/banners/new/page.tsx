import type { Metadata } from "next";
import { BannerForm } from "@/modules/banners/components/banner-form";

export const metadata: Metadata = { title: "New banner" };

export default function NewBannerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">New banner</h1>
      <BannerForm />
    </div>
  );
}
