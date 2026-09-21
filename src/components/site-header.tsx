import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getUserRoles } from "@/modules/auth/session";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";

/** Minimal nav. Full site UI/branding is Phase 21. */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const userRoleNames = user ? await getUserRoles(user.id) : [];
  const isAdmin = userRoleNames.includes("admin");

  return (
    <header className="flex h-16 items-center justify-between border-b px-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold">
          my-store
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/products" className="text-muted-foreground hover:text-foreground">
            Shop
          </Link>
          <Link href="/categories" className="text-muted-foreground hover:text-foreground">
            Categories
          </Link>
        </nav>
      </div>
      <nav className="flex items-center gap-2">
        {user ? (
          <>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/admin">Admin</Link>}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/account">My account</Link>}
            />
            <SignOutButton />
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/login">Sign in</Link>}
            />
            <Button size="sm" nativeButton={false} render={<Link href="/register">Sign up</Link>} />
          </>
        )}
      </nav>
    </header>
  );
}
