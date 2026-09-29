"use client";

import { deleteBannerAction } from "@/modules/banners/actions";

export function DeleteBannerButton({ bannerId, bannerTitle }: { bannerId: string; bannerTitle: string }) {
  return (
    <form
      action={deleteBannerAction}
      onSubmit={(event) => {
        if (!confirm(`Delete the "${bannerTitle || "untitled"}" banner? This can't be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={bannerId} />
      <button type="submit" className="text-destructive text-sm hover:underline">
        Delete
      </button>
    </form>
  );
}
