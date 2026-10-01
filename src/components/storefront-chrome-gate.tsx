"use client";

import { usePathname } from "next/navigation";

/** Hides storefront-only chrome (the marketing footer) on /admin, which has its own
 * sidebar nav and shouldn't also carry the storefront's footer below it. */
export function StorefrontChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return children;
}
