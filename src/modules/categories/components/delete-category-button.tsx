"use client";

import { deleteCategoryAction } from "@/modules/categories/actions";

export function DeleteCategoryButton({
  categoryId,
  categoryName,
}: {
  categoryId: string;
  categoryName: string;
}) {
  return (
    <form
      action={deleteCategoryAction}
      onSubmit={(event) => {
        if (
          !confirm(
            `Delete "${categoryName}"? This can be restored later, but it will disappear from the storefront immediately.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={categoryId} />
      <button type="submit" className="text-destructive text-sm hover:underline">
        Delete
      </button>
    </form>
  );
}
