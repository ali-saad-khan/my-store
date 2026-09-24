"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
} from "@/modules/categories/actions";

type CategoryOption = { id: string; name: string };

type CategoryDefaults = {
  id?: string;
  name?: string;
  slug?: string;
  parentId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export function CategoryForm({
  category,
  parentOptions,
}: {
  category?: CategoryDefaults;
  parentOptions: CategoryOption[];
}) {
  const action = category?.id ? updateCategoryAction : createCategoryAction;
  const [state, formAction] = useActionState<CategoryActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {category?.id && <input type="hidden" name="id" value={category.id} />}
      <FormMessage error={state?.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={category?.name} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={category?.slug} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentId">Parent category</Label>
          <select
            id="parentId"
            name="parentId"
            defaultValue={category?.parentId ?? ""}
            className="border-border bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="">None (top-level)</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={category?.sortOrder ?? 0}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="imageUrl">Image URL (optional)</Label>
          <Input id="imageUrl" name="imageUrl" type="url" defaultValue={category?.imageUrl ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description (optional)</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={category?.description ?? ""}
            className="border-border bg-background w-full rounded-lg border px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seoTitle">SEO title (optional)</Label>
          <Input id="seoTitle" name="seoTitle" defaultValue={category?.seoTitle ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seoDescription">SEO description (optional)</Label>
          <Input
            id="seoDescription"
            name="seoDescription"
            defaultValue={category?.seoDescription ?? ""}
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={category?.isActive ?? true}
            className="size-4"
          />
          Active (visible in the storefront)
        </label>
      </div>

      <SubmitButton pendingText="Saving...">
        {category?.id ? "Save changes" : "Create category"}
      </SubmitButton>
    </form>
  );
}
