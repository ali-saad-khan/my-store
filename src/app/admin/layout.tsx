import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/modules/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
