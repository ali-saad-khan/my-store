"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { adjustInventoryAction } from "@/modules/inventory/actions";
import { MANUAL_MOVEMENT_TYPES } from "@/validations/inventory";

const TYPE_LABELS: Record<(typeof MANUAL_MOVEMENT_TYPES)[number], string> = {
  purchase: "Purchase",
  return: "Return",
  adjustment: "Adjustment",
  damage: "Damage",
  cancellation: "Cancellation",
};

export function AdjustInventoryForm({ inventoryId }: { inventoryId: string }) {
  const [state, formAction] = useActionState(adjustInventoryAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <input type="hidden" name="inventoryId" value={inventoryId} />
        <select
          name="type"
          defaultValue="adjustment"
          aria-label="Movement type"
          className="border-border bg-background h-8 rounded-lg border px-2 text-sm"
        >
          {MANUAL_MOVEMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="quantity"
          aria-label="Quantity (use a negative number to decrease stock)"
          placeholder="+/- qty"
          required
          className="border-border bg-background h-8 w-24 rounded-lg border px-2 text-sm"
        />
        <SubmitButton size="sm" className="w-auto" pendingText="Saving...">
          Apply
        </SubmitButton>
      </div>
      {(state?.error || state?.success) && (
        <FormMessage error={state?.error} success={state?.success} />
      )}
    </form>
  );
}
