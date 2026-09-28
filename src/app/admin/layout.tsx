import type { Metadata } from "next";
import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/modules/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
