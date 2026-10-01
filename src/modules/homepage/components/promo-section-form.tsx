"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateSectionContentAction,
  type HomepageActionState,
} from "@/modules/homepage/actions";
import type { PromoContent } from "@/validations/homepage";

export function PromoSectionForm({ content }: { content: PromoContent }) {
  const [state, formAction] = useActionState<HomepageActionState, FormData>(
    updateSectionContentAction,
    undefined,
  );

  useEffect(() => {
    if (state?.success) toast.success("Promo banner saved.");
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="key" value="promo" />
      <FormMessage error={state?.error} />

      {content.imageUrl && (
        <div className="space-y-1.5">
          <Label>Current image</Label>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview only */}
          <img src={content.imageUrl} alt="" className="h-28 w-full max-w-sm rounded-lg object-cover" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="promo-imageFile">Replace image (optional)</Label>
          <input
            id="promo-imageFile"
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="border-border bg-background w-full rounded-lg border px-2.5 py-1.5 text-sm"
          />
          <input type="hidden" name="imageUrl" value={content.imageUrl ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-eyebrow">Eyebrow</Label>
          <Input id="promo-eyebrow" name="eyebrow" defaultValue={content.eyebrow ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-ctaLabel">Button label</Label>
          <Input id="promo-ctaLabel" name="ctaLabel" defaultValue={content.ctaLabel ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="promo-heading">Heading</Label>
          <Input id="promo-heading" name="heading" defaultValue={content.heading ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="promo-subcopy">Subcopy</Label>
          <Textarea id="promo-subcopy" name="subcopy" rows={2} defaultValue={content.subcopy ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="promo-ctaLink">Button link</Label>
          <Input
            id="promo-ctaLink"
            name="ctaLink"
            placeholder="/products"
            defaultValue={content.ctaLink ?? ""}
          />
        </div>
      </div>
      <SubmitButton pendingText="Saving...">Save</SubmitButton>
    </form>
  );
}
