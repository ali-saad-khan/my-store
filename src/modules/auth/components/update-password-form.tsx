"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updatePassword } from "@/modules/auth/actions";
import { FormMessage } from "@/components/form-message";

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePassword, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state?.error} success={state?.success} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <SubmitButton pendingText="Updating...">Update password</SubmitButton>
    </form>
  );
}
