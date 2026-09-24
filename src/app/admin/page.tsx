import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Admin" };

/**
 * The full admin dashboard (products, orders, customers, ...) is Phase 8.
 * Sections land here as their phases complete.
 */
export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
          <CardDescription>Signed in as {user.email} with the admin role.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          The full admin dashboard is built in Phase 8.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <Link href="/admin/inventory" className="underline">
              Inventory
            </Link>
          </CardTitle>
          <CardDescription>Stock levels, low-stock alerts, and manual adjustments.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
