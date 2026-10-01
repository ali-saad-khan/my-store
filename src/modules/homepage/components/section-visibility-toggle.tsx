"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleSectionVisibilityAction } from "@/modules/homepage/actions";
import type { HomepageSectionKey } from "@/validations/homepage";

export function SectionVisibilityToggle({
  sectionKey,
  isVisible,
}: {
  sectionKey: HomepageSectionKey;
  isVisible: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await toggleSectionVisibilityAction(formData);
          toast.success(formData.get("isVisible") === "true" ? "Section shown." : "Section hidden.");
        });
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="key" value={sectionKey} />
      <input type="hidden" name="isVisible" value={String(!isVisible)} />
      <Switch
        checked={isVisible}
        disabled={isPending}
        onCheckedChange={() => formRef.current?.requestSubmit()}
        aria-label={isVisible ? "Hide section" : "Show section"}
      />
      <span className="text-muted-foreground text-xs">{isVisible ? "Visible" : "Hidden"}</span>
    </form>
  );
}
