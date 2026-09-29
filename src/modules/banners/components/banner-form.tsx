"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBannerAction,
  updateBannerAction,
  type BannerActionState,
} from "@/modules/banners/actions";

type BannerDefaults = {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaLink?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  imageUrl?: string;
};

export function BannerForm({ banner }: { banner?: BannerDefaults }) {
  const isEdit = Boolean(banner?.id);
  const action = isEdit ? updateBannerAction : createBannerAction;
  const [state, formAction] = useActionState<BannerActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={banner!.id} />}
      <FormMessage error={state?.error} />

      {banner?.imageUrl && (
        <div className="space-y-1.5">
          <Label>Current image</Label>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview only, not the optimized storefront render */}
          <img
            src={banner.imageUrl}
            alt=""
            className="h-32 w-full max-w-sm rounded-lg object-cover"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="imageFile">{isEdit ? "Replace image" : "Image"}</Label>
        <input
          id="imageFile"
          name="imageFile"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="border-border bg-background w-full rounded-lg border px-2.5 py-1.5 text-sm"
        />
        <p className="text-muted-foreground text-xs">
          JPEG, PNG, WebP, or AVIF, up to 5MB. Recommended: wide (e.g. 1600×600), uploaded to
          Supabase Storage.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="imageUrl">Or image URL{isEdit ? " (leave blank to keep current)" : ""}</Label>
        <Input id="imageUrl" name="imageUrl" type="url" placeholder="https://..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title (optional)</Label>
          <Input id="title" name="title" defaultValue={banner?.title ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subtitle">Subtitle (optional)</Label>
          <Input id="subtitle" name="subtitle" defaultValue={banner?.subtitle ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ctaLabel">Button label (optional)</Label>
          <Input id="ctaLabel" name="ctaLabel" defaultValue={banner?.ctaLabel ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ctaLink">Button link (optional)</Label>
          <Input
            id="ctaLink"
            name="ctaLink"
            placeholder="/products"
            defaultValue={banner?.ctaLink ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input id="sortOrder" name="sortOrder" type="number" defaultValue={banner?.sortOrder ?? 0} />
        </div>
        <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={banner?.isActive ?? true}
            className="size-4"
          />
          Active (visible on the homepage)
        </label>
      </div>

      <SubmitButton pendingText="Saving...">
        {isEdit ? "Save changes" : "Create banner"}
      </SubmitButton>
    </form>
  );
}
