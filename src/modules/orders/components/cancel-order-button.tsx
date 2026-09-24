"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { cancelOrderAction } from "@/modules/orders/actions";

export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const [state, formAction] = useActionState(cancelOrderAction, undefined);

  if (state?.success) {
    return <FormMessage success={state.success} />;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <SubmitButton variant="destructive" size="sm" className="w-auto" pendingText="Cancelling...">
        Cancel order
      </SubmitButton>
      <FormMessage error={state?.error} />
    </form>
  );
}
