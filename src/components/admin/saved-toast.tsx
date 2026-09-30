"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Fires a success toast once when the page loads with `?saved=1` (set by a create/update
 * Server Action's redirect), then strips the param so refreshing doesn't re-toast. Render
 * once near the top of an admin edit/new page.
 */
export function SavedToast({ message = "Saved." }: { message?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("saved") !== "1") return;
    toast.success(message);
    const params = new URLSearchParams(searchParams);
    params.delete("saved");
    const query = params.toString();
    router.replace(query ? `?${query}` : window.location.pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
