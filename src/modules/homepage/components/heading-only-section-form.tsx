"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateSectionContentAction,
  type HomepageActionState,
} from "@/modules/homepage/actions";
import type { HeadingOnlyContent, HomepageSectionKey } from "@/validations/homepage";

export function HeadingOnlySectionForm({
  sectionKey,
  content,
  placeholder,
}: {
  sectionKey: Extract<HomepageSectionKey, "categories" | "featured_products">;
  content: HeadingOnlyContent;
  placeholder: string;
}) {
  const [state, formAction] = useActionState<HomepageActionState, FormData>(
    updateSectionContentAction,
    undefined,
  );

  useEffect(() => {
    if (state?.success) toast.success("Section saved.");
  }, [state]);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="key" value={sectionKey} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor={`${sectionKey}-heading`}>Heading</Label>
        <Input
          id={`${sectionKey}-heading`}
          name="heading"
          placeholder={placeholder}
          defaultValue={content.heading ?? ""}
        />
      </div>
      <SubmitButton pendingText="Saving..." className="w-auto shrink-0">
        Save
      </SubmitButton>
      <FormMessage error={state?.error} />
    </form>
  );
}
