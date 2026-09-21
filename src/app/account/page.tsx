import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile, getUserRoles, requireUser } from "@/modules/auth/session";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const userRoleNames = await getUserRoles(user.id);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>My account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {profile?.fullName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {profile?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Roles:</span> {userRoleNames.join(", ")}
          </p>
        </CardContent>
      </Card>
      <SignOutButton />
    </div>
  );
}
