"use client";

import { deleteProductAction } from "@/modules/products/admin-actions";

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  return (
    <form
      action={deleteProductAction}
      onSubmit={(event) => {
        if (
          !confirm(`Archive "${productName}"? It will disappear from the storefront immediately.`)
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={productId} />
      <button type="submit" className="text-destructive text-sm hover:underline">
        Archive
      </button>
    </form>
  );
}
