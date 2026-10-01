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
import type { NewsletterContent } from "@/validations/homepage";

export function NewsletterSectionForm({ content }: { content: NewsletterContent }) {
  const [state, formAction] = useActionState<HomepageActionState, FormData>(
    updateSectionContentAction,
    undefined,
  );

  useEffect(() => {
    if (state?.success) toast.success("Newsletter section saved.");
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="key" value="newsletter" />
      <FormMessage error={state?.error} />
      <div className="space-y-1.5">
        <Label htmlFor="nl-heading">Heading</Label>
        <Input id="nl-heading" name="heading" defaultValue={content.heading ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nl-subcopy">Subcopy</Label>
        <Textarea id="nl-subcopy" name="subcopy" rows={2} defaultValue={content.subcopy ?? ""} />
      </div>
      <SubmitButton pendingText="Saving...">Save</SubmitButton>
    </form>
  );
}
