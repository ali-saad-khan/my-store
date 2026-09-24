"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { updateOrderStatusAction } from "@/modules/orders/actions";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/modules/orders/status";

export function UpdateOrderStatusForm({
  orderNumber,
  nextStatuses,
}: {
  orderNumber: string;
  nextStatuses: OrderStatus[];
}) {
  const [state, formAction] = useActionState(updateOrderStatusAction, undefined);

  if (nextStatuses.length === 0) {
    return <p className="text-muted-foreground text-sm">This order is in a final state.</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="toStatus"
          defaultValue={nextStatuses[0]}
          className="border-border bg-background h-8 rounded-lg border px-2 text-sm"
        >
          {nextStatuses.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="note"
          placeholder="Note (optional)"
          className="border-border bg-background h-8 flex-1 rounded-lg border px-2 text-sm"
        />
        <SubmitButton size="sm" className="w-auto" pendingText="Updating...">
          Update status
        </SubmitButton>
      </div>
      <FormMessage error={state?.error} success={state?.success} />
    </form>
  );
}
