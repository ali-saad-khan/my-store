import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Admin" };

/**
 * Placeholder confirming server-side admin authorization works end-to-end.
 * The full admin dashboard (products, orders, customers, ...) is Phase 8.
 */
export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
          <CardDescription>Signed in as {user.email} with the admin role.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          The full admin dashboard is built in Phase 8.
        </CardContent>
      </Card>
    </div>
  );
}
