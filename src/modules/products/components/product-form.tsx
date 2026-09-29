"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/modules/products/admin-actions";
import { PRODUCT_STATUS_VALUES } from "@/validations/product";

type AttributeOption = { id: string; name: string; values: { id: string; value: string }[] };

type VariantDefault = {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  costPrice: string | null;
  weight: string | null;
  status: string;
  attributeValues: Record<string, string>;
  currentStock: number | null;
};

type ProductDefaults = {
  id?: string;
  name?: string;
  slug?: string;
  sku?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  brand?: string | null;
  price?: string | null;
  compareAtPrice?: string | null;
  costPrice?: string | null;
  weight?: string | null;
  status?: string;
  isFeatured?: boolean;
  hasVariants?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  categoryIds?: string[];
  imageUrls?: string[];
  currentStock?: number | null;
  reorderPoint?: number;
  variants?: VariantDefault[];
};

type VariantRowState = {
  id: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  weight: string;
  status: string;
  attributeValues: Record<string, string>;
  initialStock: string;
  reorderPoint: string;
  currentStock: number | null;
};

function emptyVariantRow(): VariantRowState {
  return {
    id: "",
    sku: "",
    price: "",
    compareAtPrice: "",
    costPrice: "",
    weight: "",
    status: "active",
    attributeValues: {},
    initialStock: "0",
    reorderPoint: "5",
    currentStock: null,
  };
}

export function ProductForm({
  product,
  categoryOptions,
  attributeOptions,
}: {
  product?: ProductDefaults;
  categoryOptions: { id: string; name: string }[];
  attributeOptions: AttributeOption[];
}) {
  const isEdit = Boolean(product?.id);
  const action = isEdit ? updateProductAction : createProductAction;
  const [state, formAction] = useActionState<ProductActionState, FormData>(action, undefined);

  const [hasVariants, setHasVariants] = useState(product?.hasVariants ?? false);
  const [imageUrls, setImageUrls] = useState<string[]>(
    product?.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [""],
  );
  const [variantRows, setVariantRows] = useState<VariantRowState[]>(
    product?.variants?.map((v) => ({
      id: v.id,
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? "",
      costPrice: v.costPrice ?? "",
      weight: v.weight ?? "",
      status: v.status,
      attributeValues: v.attributeValues,
      initialStock: "0",
      reorderPoint: "5",
      currentStock: v.currentStock,
    })) ?? [],
  );

  function updateVariant(index: number, patch: Partial<VariantRowState>) {
    setVariantRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form action={formAction} className="space-y-8">
      {isEdit && <input type="hidden" name="id" value={product!.id} />}
      <FormMessage error={state?.error} />

      <section className="space-y-4">
        <h2 className="font-medium">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={product?.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={product?.slug} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand (optional)</Label>
            <Input id="brand" name="brand" defaultValue={product?.brand ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={product?.status ?? "draft"}
              className="border-border bg-background h-8 w-full rounded-lg border px-2 text-sm"
            >
              {PRODUCT_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="shortDescription">Short description (optional)</Label>
            <Input
              id="shortDescription"
              name="shortDescription"
              defaultValue={product?.shortDescription ?? ""}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={product?.description ?? ""}
              className="border-border bg-background w-full rounded-lg border px-2.5 py-1.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={product?.isFeatured}
              className="size-4"
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={isEdit ? undefined : "hasVariants"}
              checked={hasVariants}
              disabled={isEdit}
              onChange={(e) => setHasVariants(e.target.checked)}
              className="size-4"
            />
            Has variants{isEdit && " (fixed after creation)"}
            {/* A disabled input is excluded from FormData entirely, so on
                edit the real value travels via this always-enabled hidden
                field instead of the (visually disabled) checkbox above. */}
            {isEdit && <input type="hidden" name="hasVariants" value={hasVariants ? "on" : ""} />}
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Categories</h2>
        <div className="flex flex-wrap gap-3">
          {categoryOptions.map((category) => (
            <label key={category.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="categoryIds"
                value={category.id}
                defaultChecked={product?.categoryIds?.includes(category.id)}
                className="size-4"
              />
              {category.name}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="imageFile">Upload images</Label>
          <input
            id="imageFile"
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="border-border bg-background w-full rounded-lg border px-2.5 py-1.5 text-sm"
          />
          <p className="text-muted-foreground text-xs">
            JPEG, PNG, WebP, or AVIF, up to 5MB each. Uploaded to Supabase Storage.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Or link existing image URLs</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setImageUrls((u) => [...u, ""])}
          >
            Add image
          </Button>
        </div>
        {imageUrls.map((url, i) => (
          <div key={i} className="flex gap-2">
            <Input
              name="imageUrl"
              type="url"
              value={url}
              onChange={(e) =>
                setImageUrls((urls) => urls.map((u, idx) => (idx === i ? e.target.value : u)))
              }
              placeholder="https://..."
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setImageUrls((urls) => urls.filter((_, idx) => idx !== i))}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      {!hasVariants && (
        <section className="space-y-4">
          <h2 className="font-medium">Pricing &amp; stock</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                name="sku"
                defaultValue={product?.sku ?? ""}
                required={!hasVariants}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                defaultValue={product?.price ?? ""}
                required={!hasVariants}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="compareAtPrice">Compare-at price (optional)</Label>
              <Input
                id="compareAtPrice"
                name="compareAtPrice"
                defaultValue={product?.compareAtPrice ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costPrice">Cost price (optional)</Label>
              <Input id="costPrice" name="costPrice" defaultValue={product?.costPrice ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight, kg (optional)</Label>
              <Input id="weight" name="weight" defaultValue={product?.weight ?? ""} />
            </div>
            {isEdit ? (
              <div className="space-y-1.5">
                <Label>Stock on hand</Label>
                <p className="text-muted-foreground pt-1.5 text-sm">
                  {product?.currentStock ?? 0} — adjust at{" "}
                  <a href="/admin/inventory" className="underline">
                    /admin/inventory
                  </a>
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="initialStock">Initial stock</Label>
                <Input id="initialStock" name="initialStock" type="number" defaultValue={0} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reorderPoint">Reorder point</Label>
              <Input
                id="reorderPoint"
                name="reorderPoint"
                type="number"
                defaultValue={product?.reorderPoint ?? 5}
              />
            </div>
          </div>
        </section>
      )}

      {hasVariants && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Variants</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setVariantRows((rows) => [...rows, emptyVariantRow()])}
            >
              Add variant
            </Button>
          </div>

          {variantRows.length === 0 && (
            <p className="text-muted-foreground text-sm">No variants yet — add at least one.</p>
          )}

          {variantRows.map((row, i) => (
            <div key={i} className="border-border space-y-3 rounded-lg border p-3">
              <input type="hidden" name="variantId" value={row.id} />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>SKU</Label>
                  <Input
                    name="variantSku"
                    value={row.sku}
                    onChange={(e) => updateVariant(i, { sku: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Price</Label>
                  <Input
                    name="variantPrice"
                    value={row.price}
                    onChange={(e) => updateVariant(i, { price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Compare-at (optional)</Label>
                  <Input
                    name="variantCompareAtPrice"
                    value={row.compareAtPrice}
                    onChange={(e) => updateVariant(i, { compareAtPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cost (optional)</Label>
                  <Input
                    name="variantCostPrice"
                    value={row.costPrice}
                    onChange={(e) => updateVariant(i, { costPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Weight, kg (optional)</Label>
                  <Input
                    name="variantWeight"
                    value={row.weight}
                    onChange={(e) => updateVariant(i, { weight: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <select
                    name="variantStatus"
                    value={row.status}
                    onChange={(e) => updateVariant(i, { status: e.target.value })}
                    className="border-border bg-background h-8 w-full rounded-lg border px-2 text-sm"
                  >
                    {PRODUCT_STATUS_VALUES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {attributeOptions.map((attribute) => (
                  <div key={attribute.id} className="space-y-1">
                    <Label>{attribute.name}</Label>
                    <select
                      name={`variantAttr_${attribute.id}`}
                      value={row.attributeValues[attribute.id] ?? ""}
                      onChange={(e) =>
                        updateVariant(i, {
                          attributeValues: {
                            ...row.attributeValues,
                            [attribute.id]: e.target.value,
                          },
                        })
                      }
                      className="border-border bg-background h-8 rounded-lg border px-2 text-sm"
                    >
                      <option value="">—</option>
                      {attribute.values.map((value) => (
                        <option key={value.id} value={value.id}>
                          {value.value}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                {row.id ? (
                  <div className="space-y-1">
                    <Label>Stock on hand</Label>
                    <p className="text-muted-foreground pt-1.5 text-sm">
                      {row.currentStock ?? 0} — adjust at{" "}
                      <a href="/admin/inventory" className="underline">
                        /admin/inventory
                      </a>
                    </p>
                    {/* Ignored server-side for an existing variant — kept only so every
                        row submits one variantInitialStock entry, or the parallel
                        arrays the action zips by index would fall out of sync. */}
                    <input type="hidden" name="variantInitialStock" value="0" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>Initial stock</Label>
                    <Input
                      name="variantInitialStock"
                      type="number"
                      value={row.initialStock}
                      onChange={(e) => updateVariant(i, { initialStock: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Reorder point</Label>
                  <Input
                    name="variantReorderPoint"
                    type="number"
                    value={row.reorderPoint}
                    onChange={(e) => updateVariant(i, { reorderPoint: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setVariantRows((rows) => rows.filter((_, idx) => idx !== i))}
                >
                  Remove variant
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-medium">SEO</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle">SEO title (optional)</Label>
            <Input id="seoTitle" name="seoTitle" defaultValue={product?.seoTitle ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoKeywords">SEO keywords (optional)</Label>
            <Input id="seoKeywords" name="seoKeywords" defaultValue={product?.seoKeywords ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="seoDescription">SEO description (optional)</Label>
            <Input
              id="seoDescription"
              name="seoDescription"
              defaultValue={product?.seoDescription ?? ""}
            />
          </div>
        </div>
      </section>

      <SubmitButton pendingText="Saving...">
        {isEdit ? "Save changes" : "Create product"}
      </SubmitButton>
    </form>
  );
}
