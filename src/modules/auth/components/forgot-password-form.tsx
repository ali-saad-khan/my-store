"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/modules/auth/actions";
import { AuthMessage } from "./auth-message";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <AuthMessage error={state?.error} success={state?.success} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <SubmitButton pendingText="Sending...">Send reset link</SubmitButton>
    </form>
  );
}
