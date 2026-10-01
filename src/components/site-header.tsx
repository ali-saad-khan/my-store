import Link from "next/link";
import { ShoppingCart, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getUserRoles } from "@/modules/auth/session";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";
import { getCartItemCount } from "@/modules/cart/queries";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const [userRoleNames, cartItemCount] = await Promise.all([
    user ? getUserRoles(user.id) : Promise.resolve([]),
    getCartItemCount(),
  ]);
  const isAdmin = userRoleNames.includes("admin");

  return (
    <div className="sticky top-0 z-20">
      <div className="bg-foreground text-background px-4 py-2 text-center text-xs font-semibold tracking-wide uppercase">
        Free delivery across Pakistan on orders over Rs 2,500
      </div>
      <header className="bg-background flex h-[72px] items-center justify-between border-b px-6 sm:px-12">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-xl font-black tracking-tight">
            my-store
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold sm:flex">
            <Link href="/products" className="hover:text-brand-accent">
              Shop
            </Link>
            <Link href="/categories" className="hover:text-brand-accent">
              Categories
            </Link>
          </nav>
        </div>
        <nav className="flex items-center gap-1.5">
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
                size="icon"
                nativeButton={false}
                render={
                  <Link href="/account" aria-label="My account">
                    <UserRound />
                  </Link>
                }
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
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            className="relative"
            render={
              <Link
                href="/cart"
                aria-label={`Cart, ${cartItemCount} item${cartItemCount === 1 ? "" : "s"}`}
              >
                <ShoppingCart />
                {cartItemCount > 0 && (
                  <span className="bg-brand-accent text-brand-accent-foreground absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            }
          />
        </nav>
      </header>
    </div>
  );
}
